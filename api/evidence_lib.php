<?php
/* Private evidence for Google64 B1/A8. Keep records outside public_html. */
define('MCQ_EVIDENCE_ROOT', '/home/xs579028/mcq-private-evidence');
define('MCQ_QUEST_API', 'https://script.google.com/macros/s/AKfycbzIpwPd49mlcRpuPa43fdg9P4n8mN2wEXFy2IcbrM87r5E90VjTHg1nhzVHn2b2Wxro/exec');

function ev_error($message, $code) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(array('ok'=>false, 'error'=>$message), JSON_UNESCAPED_UNICODE);
  exit;
}
if (!function_exists('hash_equals')) {
  function hash_equals($known, $given) {
    if (strlen($known)!==strlen($given)) return false;
    $diff=0;
    for ($i=0;$i<strlen($known);$i++) $diff |= ord($known[$i]) ^ ord($given[$i]);
    return $diff===0;
  }
}
function ev_json($value) {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($value, JSON_UNESCAPED_UNICODE);
  exit;
}
function ev_private_dir() {
  $root = MCQ_EVIDENCE_ROOT;
  foreach (array($root, $root.'/images', $root.'/records') as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) ev_error('保存領域を利用できません。', 503);
    @chmod($dir, 0700);
  }
  return $root;
}
function ev_key() {
  $path = ev_private_dir().'/key.bin';
  if (!is_file($path)) {
    $bytes = openssl_random_pseudo_bytes(32);
    $handle = @fopen($path, 'x');
    if ($handle) { fwrite($handle, $bytes); fclose($handle); @chmod($path, 0600); }
  }
  $key = @file_get_contents($path);
  if (strlen($key) !== 32) ev_error('暗号鍵を利用できません。', 503);
  return $key;
}
function ev_encrypt_token($token) {
  $key = ev_key();
  $iv = openssl_random_pseudo_bytes(16);
  $cipher = openssl_encrypt($token, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
  if ($cipher === false) ev_error('提出を保存できません。', 503);
  $mac = hash_hmac('sha256', $iv.$cipher, $key, true);
  return base64_encode($iv.$mac.$cipher);
}
function ev_decrypt_token($encoded) {
  $raw = base64_decode($encoded, true);
  if ($raw === false || strlen($raw) < 65) return false;
  $iv=substr($raw,0,16); $mac=substr($raw,16,32); $cipher=substr($raw,48);
  $valid=hash_hmac('sha256',$iv.$cipher,ev_key(),true);
  if (!hash_equals($valid,$mac)) return false;
  return openssl_decrypt($cipher,'aes-256-cbc',ev_key(),OPENSSL_RAW_DATA,$iv);
}
function ev_quest_request($fields) {
  $ch=curl_init(MCQ_QUEST_API);
  curl_setopt($ch,CURLOPT_POST,true);
  curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($fields,'','&'));
  curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
  curl_setopt($ch,CURLOPT_FOLLOWLOCATION,true);
  curl_setopt($ch,CURLOPT_TIMEOUT,25);
  curl_setopt($ch,CURLOPT_SSL_VERIFYPEER,true);
  $body=curl_exec($ch);
  $status=curl_getinfo($ch,CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($body === false || $status < 200 || $status >= 300) return null;
  $json=json_decode($body,true);
  return is_array($json) ? $json : null;
}
function ev_record_path($id) {
  if (!preg_match('/^[a-f0-9]{32}$/D',$id)) ev_error('提出IDが不正です。',400);
  return ev_private_dir().'/records/'.$id.'.json';
}
function ev_load($id) {
  $path=ev_record_path($id);
  if (!is_file($path)) ev_error('提出記録がありません。',404);
  $record=json_decode(file_get_contents($path),true);
  if (!is_array($record)) ev_error('提出記録を読めません。',503);
  return $record;
}
function ev_save($record) {
  $path=ev_record_path($record['submissionId']);
  $tmp=$path.'.tmp'.bin2hex(openssl_random_pseudo_bytes(4));
  if (file_put_contents($tmp,json_encode($record,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),LOCK_EX) === false) ev_error('提出記録を保存できません。',503);
  @chmod($tmp,0600);
  if (!rename($tmp,$path)) ev_error('提出記録を保存できません。',503);
}
