<?php
require dirname(__DIR__).'/evidence_lib.php';
session_start();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function h($s) { return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8'); }
if (empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(openssl_random_pseudo_bytes(16));
if (isset($_GET['image'])) {
  $record=ev_load((string)$_GET['image']);
  $path=ev_private_dir().'/images/'.$record['imageFile'];
  if (!is_file($path)) ev_error('画像がありません。',404);
  $type=@getimagesize($path);
  if (!$type || strpos($type['mime'],'image/')!==0) ev_error('画像を読めません。',503);
  header('Content-Type: '.$type['mime']);
  header('Content-Disposition: inline; filename="evidence.jpg"');
  readfile($path);
  exit;
}
$notice='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
  $csrf=isset($_POST['csrf'])?(string)$_POST['csrf']:'';
  if (!hash_equals($_SESSION['csrf'],$csrf)) ev_error('確認画面を開き直してください。',403);
  $id=isset($_POST['id'])?(string)$_POST['id']:'';
  $decision=isset($_POST['decision'])?(string)$_POST['decision']:'';
  $record=ev_load($id);
  if ($record['status']!=='lecturer_review' && $record['status']!=='resubmit') ev_error('この提出は確認済みです。',409);
  if ($decision==='verified') {
    $token=ev_decrypt_token($record['tokenCipher']);
    if (!$token) ev_error('会員情報を読み取れません。',503);
    $result=ev_quest_request(array('action'=>'report','token'=>$token,'goalId'=>'β',
      'qid'=>$record['qid'],'pct'=>'125','step'=>'practice','note'=>'講師が本人の操作証跡を確認',
      'evidenceUrl'=>'private:'.$id));
    if (!$result || empty($result['ok'])) ev_error('達成記録を更新できませんでした。再試行してください。',503);
    $record['status']='verified';
    $record['reason']='講師が操作証跡を確認しました。';
    $notice='確認済みとして125%を反映しました。';
  } elseif ($decision==='resubmit') {
    $reason=trim((string)(isset($_POST['reason'])?$_POST['reason']:''));
    if ($reason==='') ev_error('再提出の理由を入力してください。',400);
    $record['status']='resubmit';
    $record['reason']=mb_substr($reason,0,300,'UTF-8');
    $notice='要再提出として記録しました。';
  } else ev_error('判定を選んでください。',400);
  $record['reviewedAt']=gmdate('c');
  $record['reviewer']=isset($_SERVER['PHP_AUTH_USER'])?$_SERVER['PHP_AUTH_USER']:'teacher';
  ev_save($record);
}
$paths=glob(ev_private_dir().'/records/*.json');
rsort($paths,SORT_STRING);
$paths=array_slice($paths,0,100);
?><!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCQ証跡確認</title><style>body{font:16px/1.65 system-ui,sans-serif;background:#f4f7fb;color:#172033;margin:0}main{max-width:980px;margin:auto;padding:20px}h1{font-size:1.6rem}.card{background:#fff;border:1px solid #dce3ed;border-radius:12px;padding:18px;margin:16px 0}img{display:block;max-width:100%;height:auto;border:1px solid #bbb;margin:12px 0}button{padding:9px 16px;margin:4px;border:0;border-radius:8px;background:#1769aa;color:#fff;font-size:1rem;cursor:pointer}.reject{background:#a43939}input[type=text]{width:min(100%,500px);padding:9px}small{color:#59677a}</style></head><body><main>
<h1>MCQ Google編・証跡確認</h1><p>提出画像を見て、本人の操作と課題の完成条件を確認してください。B1は依頼・確認質問・修正・完成版、A8はリンク共有設定と相手側の確認を見ます。</p>
<?php if ($notice!=='') echo '<p class="card">'.h($notice).'</p>'; ?>
<?php foreach($paths as $path): $r=json_decode(file_get_contents($path),true); if(!is_array($r)) continue; ?>
<section class="card"><strong><?php echo h($r['qid']); ?> / <?php echo h($r['nickname']); ?></strong>
<br><small><?php echo h($r['createdAt']); ?> ｜ <?php echo h($r['status']); ?> ｜ <?php echo h($r['submissionId']); ?></small>
<p><?php echo h($r['reason']); ?></p>
<img src="?image=<?php echo h($r['submissionId']); ?>" alt="提出スクリーンショット" loading="lazy">
<?php if ($r['status']==='lecturer_review' || $r['status']==='resubmit'): ?>
<form method="post"><input type="hidden" name="csrf" value="<?php echo h($_SESSION['csrf']); ?>"><input type="hidden" name="id" value="<?php echo h($r['submissionId']); ?>">
<button name="decision" value="verified" onclick="return confirm('本人の操作と完成条件を確認し、125%へ反映しますか？')">確認済み・125%反映</button>
<br><input type="text" name="reason" maxlength="300" placeholder="再提出の理由（例：修正後の画面が写っていない）">
<button class="reject" name="decision" value="resubmit">要再提出</button></form><?php endif; ?>
</section><?php endforeach; ?>
</main></body></html>
