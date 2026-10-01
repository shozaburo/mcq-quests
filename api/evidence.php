<?php
require __DIR__.'/evidence_lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') ev_error('POSTで送信してください。',405);
if ((int)(isset($_SERVER['CONTENT_LENGTH'])?$_SERVER['CONTENT_LENGTH']:0) > 7*1024*1024) ev_error('画像は4MB以下にしてください。',413);
$input=json_decode(file_get_contents('php://input'),true);
if (!is_array($input)) ev_error('提出内容を読めません。',400);
$action=isset($input['action']) ? (string)$input['action'] : '';
$token=isset($input['token']) ? trim((string)$input['token']) : '';
if ($token === '' || strlen($token)>256) ev_error('受講者用リンクからログインしてください。',401);
if ($action === 'status') {
  $record=ev_load(isset($input['submissionId'])?(string)$input['submissionId']:'');
  if (!hash_equals($record['tokenHash'],hash('sha256',$token))) ev_error('確認する権限がありません。',403);
  ev_json(array('ok'=>true,'submissionId'=>$record['submissionId'],'status'=>$record['status'],'reason'=>$record['reason'],'verified'=>$record['status']==='verified'));
}
if ($action !== 'saveEvidence') ev_error('操作を確認してください。',400);
if ((string)(isset($input['goalId'])?$input['goalId']:'') !== 'β') ev_error('Google編専用の提出先です。',400);
$qid=strtoupper((string)(isset($input['qid'])?$input['qid']:''));
if ($qid !== 'B1' && $qid !== 'A8') ev_error('この課題は対象外です。',400);
$data=(string)(isset($input['imageBase64'])?$input['imageBase64']:'');
if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#D',$data,$parts)) ev_error('JPEG・PNG・WebP画像を選んでください。',400);
$raw=base64_decode($parts[2],true);
if ($raw===false || strlen($raw)<100 || strlen($raw)>4*1024*1024) ev_error('画像は4MB以下にしてください。',400);
$info=@getimagesizefromstring($raw);
if (!$info || $info[0]<800 || $info[1]<450) ev_error('文字が読める800×450以上の画像で再提出してください。',400);
$me=ev_quest_request(array('action'=>'me','token'=>$token));
if (!$me || empty($me['ok']) || empty($me['member']['memberId'])) ev_error('会員情報を確認できません。受講者用リンクから入り直してください。',401);
$id=bin2hex(openssl_random_pseudo_bytes(16));
$ext=$parts[1]==='jpeg'?'jpg':$parts[1];
$imageFile=$id.'.'.$ext;
$root=ev_private_dir();
if (file_put_contents($root.'/images/'.$imageFile,$raw,LOCK_EX)===false) ev_error('画像を保存できません。',503);
@chmod($root.'/images/'.$imageFile,0600);
$record=array('submissionId'=>$id,'createdAt'=>gmdate('c'),'memberId'=>(string)$me['member']['memberId'],
  'nickname'=>(string)(isset($me['member']['nick'])?$me['member']['nick']:''),'tokenHash'=>hash('sha256',$token),
  'tokenCipher'=>ev_encrypt_token($token),'goalId'=>'β','qid'=>$qid,'imageFile'=>$imageFile,
  'width'=>$info[0],'height'=>$info[1],'status'=>'lecturer_review',
  'reason'=>'画像を非公開で受け付けました。内容を講師が確認します。');
ev_save($record);
$logged=ev_quest_request(array('action'=>'report','token'=>$token,'goalId'=>'β','qid'=>$qid,
  'pct'=>'0','step'=>'evidence_pending','note'=>'スクリーンショット提出・講師確認待ち',
  'evidenceUrl'=>'private:'.$id));
if (!$logged || empty($logged['ok'])) {
  $record['status']='submission_error';
  $record['reason']='進捗記録へ反映できませんでした。講師へ連絡してください。';
  ev_save($record);
  ev_error('提出記録へ反映できませんでした。講師へ連絡してください。',503);
}
ev_json(array('ok'=>true,'submissionId'=>$id,'status'=>'lecturer_review','reason'=>$record['reason'],'verified'=>false));
