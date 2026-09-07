#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sunoで作った曲を、ステージのBGM（A.mp3〜H.mp3）に仕上げて並べる道具。

なにをするか
  1. 曲名のことばと、測ったテンポ（BPM）の両方から、どの部屋の曲かを見分ける
     ・曲名のことばを強め、BPMを弱めに見て、8曲と8部屋を1対1で割り当てる
     ・同じ部屋の候補が2曲あるときは、片方をランダムに選ぶ（--seed で固定）
  2. 曲の最後の無音を切る（くり返し再生で「間」があくのを防ぐ）
  3. 音量を -16 LUFS にそろえる（2回測って合わせる方式）
  4. 曲頭と曲尻の音量差を測って、つなぎ目が目立たないか確かめる
  5. A.mp3〜H.mp3 として書き出し、_report.json に結果を残す

使い方
  python3 tools/bgm-place.py <入力フォルダ> <出力フォルダ> [--seed 42] [--lufs -16]
"""
import argparse, glob, json, os, random, re, subprocess, sys

# 部屋ごとの目標テンポ（指示文で指定した値）と、曲名に出そうなことば
AREAS = {
    'A': {'bpm': 92,  'room': 'おしゃべりルーム',   'words': ['acoustic', 'folk', 'classroom', 'sunlight', 'ukulele', 'storybook', 'guitar', 'afternoon', '教室']},
    'B': {'bpm': 85,  'room': 'おまかせルーム',     'words': ['bossa', 'office', 'workflow', 'rhodes', 'tidy', 'desk', 'paper', 'productive']},
    'C': {'bpm': 100, 'room': 'いろどりルーム',     'words': ['marimba', 'colorful', 'color', 'art', 'studio', 'indie', 'pop', 'playful', 'palette', 'canvas']},
    'D': {'bpm': 72,  'room': 'じぶん専用ルーム',   'words': ['piano', 'felt', 'neo', 'classical', 'private', 'quiet room', 'cello', 'thoughtful', 'personal']},
    'E': {'bpm': 80,  'room': 'あいぼうルーム',     'words': ['jazz', 'hop', 'rain', 'trumpet', 'dusty', 'evening', 'serious', '雨', '电脳', '電脳']},
    'F': {'bpm': 108, 'room': 'ものづくりルーム',   'words': ['workshop', 'tinkering', 'tools', 'prototype', 'pizzicato', 'wood', 'cheerful', 'busy']},
    'G': {'bpm': 96,  'room': 'つながりルーム',     'words': ['electronica', 'synth', 'arpeggio', 'connection', 'connections', 'glowing', 'cable', 'network']},
    'H': {'bpm': 66,  'room': 'おるすばんルーム',   'words': ['lullaby', 'midnight', 'music box', 'celesta', 'night', 'sleeping', 'city', 'starlight']},
}
KEYS = list('ABCDEFGH')
WORD_BONUS = 30.0   # 曲名のことばが1つ当たるごとに、BPM差30ぶんの重みで有利にする


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def duration(path):
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
               '-of', 'default=nw=1:nk=1', path]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def mean_db(path, ss, t):
    r = run(['ffmpeg', '-v', 'info', '-ss', str(ss), '-t', str(t), '-i', path,
             '-af', 'volumedetect', '-f', 'null', '-']).stderr
    for line in r.splitlines():
        if 'mean_volume' in line:
            try:
                return float(line.split(':')[-1].replace('dB', '').strip())
            except ValueError:
                return None
    return None


def tail_silence(path, thresh=-50.0, step=0.5, limit=20.0):
    """曲の終わりにある無音の長さ（秒）をざっくり測る。"""
    dur = duration(path)
    gone = 0.0
    while gone < limit and dur - gone > 5:
        db = mean_db(path, dur - gone - step, step)
        if db is None or db > thresh:
            break
        gone += step
    return gone


def estimate_bpm(path):
    """テンポを測る。倍・半分の取り違えは60〜130の範囲にならす。"""
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True, duration=120)
    bpm = float(librosa.feature.tempo(y=y, sr=sr)[0])
    while bpm > 132:
        bpm /= 2
    while bpm < 58:
        bpm *= 2
    return bpm


def bpm_gap(bpm, target):
    """倍・半分のずれも同じ曲とみなして、いちばん小さい差を返す。"""
    return min(abs(bpm - target), abs(bpm * 2 - target), abs(bpm / 2 - target))


def title_hits(name, words):
    low = re.sub(r'[_\-]', ' ', os.path.splitext(os.path.basename(name))[0]).lower()
    return sum(1 for w in words if w.lower() in low)


def loudnorm(src, dst, lufs, trim_tail):
    """2回測って音量を合わせ、終わりの無音を切ってmp3で書き出す。"""
    dur = max(0.0, duration(src) - trim_tail)
    base = ['ffmpeg', '-v', 'info', '-y', '-i', src, '-t', '%.2f' % dur]
    m = run(base + ['-af', 'loudnorm=I=%d:TP=-1.5:LRA=11:print_format=json' % lufs,
                    '-f', 'null', '-']).stderr
    js = None
    try:
        js = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    except Exception:
        pass
    if js:
        af = ('loudnorm=I=%d:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:'
              'measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true'
              % (lufs, js['input_i'], js['input_tp'], js['input_lra'],
                 js['input_thresh'], js['target_offset']))
    else:
        af = 'loudnorm=I=%d:TP=-1.5:LRA=11' % lufs
    r = run(base + ['-af', af, '-codec:a', 'libmp3lame', '-b:a', '192k', dst])
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-400:])


def loopfix(src, dst, x=2.0):
    """曲の頭x秒を終わりに重ねて、くり返しのつなぎ目をなめらかにする。

    出力＝ もとの曲の x秒目〜最後 と、もとの曲の 0〜x秒 を x秒かけて重ねたもの。
    こうすると「終わり」の音が「始まり」（＝x秒目）とつながるので、
    ループしたときに音が途切れない。
    """
    dur = duration(src)
    if dur < x * 4:
        return False
    fc = ('[0:a]atrim=start=%.3f,asetpts=N/SR/TB[a];'
          '[1:a]atrim=0:%.3f,asetpts=N/SR/TB[b];'
          '[a][b]acrossfade=d=%.3f:c1=tri:c2=tri[out]' % (x, x, x))
    r = run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', src,
             '-filter_complex', fc, '-map', '[out]',
             '-codec:a', 'libmp3lame', '-b:a', '192k', dst])
    return r.returncode == 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('indir')
    ap.add_argument('outdir')
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--lufs', type=int, default=-16)
    ap.add_argument('--seam-limit', type=float, default=8.0,
                    help='つなぎ目の音量差がこれ(dB)を超えたら、ループをなめらかにする')
    ap.add_argument('--fade', type=float, default=2.0, help='重ねる秒数')
    a = ap.parse_args()
    if a.seed is not None:
        random.seed(a.seed)

    files = sorted(sum([glob.glob(os.path.join(a.indir, '*' + e))
                        for e in ('.mp3', '.wav', '.m4a', '.MP3', '.WAV', '.M4A')], []))
    if not files:
        sys.exit('入力フォルダに音のファイルがありません: ' + a.indir)
    random.shuffle(files)   # 同点のときにどちらが選ばれるかを運任せにする

    print('■ 測定（%d曲）' % len(files))
    info = []
    for f in files:
        bpm, dur = estimate_bpm(f), duration(f)
        sil = tail_silence(f)
        info.append({'path': f, 'bpm': bpm, 'dur': dur, 'sil': sil})
        print('  %-44s BPM %5.1f  長さ %4.0f秒  終わりの無音 %.1f秒'
              % (os.path.basename(f)[:44], bpm, dur, sil))

    # 曲名のことば（強め）とBPM差（弱め）で費用表をつくり、1対1で割り当てる
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    cost = np.zeros((len(info), len(KEYS)))
    for i, it in enumerate(info):
        for j, k in enumerate(KEYS):
            spec = AREAS[k]
            cost[i][j] = bpm_gap(it['bpm'], spec['bpm']) - WORD_BONUS * title_hits(it['path'], spec['words'])
    rows, cols = linear_sum_assignment(cost)
    pick, spare = {}, []
    for r, c in zip(rows, cols):
        pick[KEYS[c]] = info[r]
    used = set(id(v) for v in pick.values())
    spare = [it for it in info if id(it) not in used]

    print('\n■ 割り当てと書き出し（音量 %d LUFS）' % a.lufs)
    os.makedirs(a.outdir, exist_ok=True)
    report = []
    for k in KEYS:
        it = pick.get(k)
        if not it:
            print('  %s（%s）… 曲が足りません' % (k, AREAS[k]['room']))
            continue
        dst = os.path.join(a.outdir, k + '.mp3')
        loudnorm(it['path'], dst, a.lufs, it['sil'])
        def measure(path):
            h, t = mean_db(path, 0, 0.6), mean_db(path, max(0, duration(path) - 0.6), 0.6)
            return abs(h - t) if (h is not None and t is not None) else None
        seam = measure(dst)
        fixed = False
        if seam is not None and seam > a.seam_limit:
            tmp = dst + '.fix.mp3'
            if loopfix(dst, tmp, a.fade):
                seam2 = measure(tmp)
                if seam2 is not None and seam2 < seam:
                    os.replace(tmp, dst)
                    seam, fixed = seam2, True
                elif os.path.exists(tmp):
                    os.remove(tmp)
        mb = os.path.getsize(dst) / 1024 / 1024
        hits = title_hits(it['path'], AREAS[k]['words'])
        print('  %s（%s）← %-34s BPM %5.1f/目標%3d  名前の一致%d  %4.0f秒 %.1fMB  つなぎ目差 %s'
              % (k, AREAS[k]['room'], os.path.basename(it['path'])[:34], it['bpm'],
                 AREAS[k]['bpm'], hits, duration(dst), mb,
                 (('%.1fdB' % seam) + ('（なめらかに補正）' if fixed else '')) if seam is not None else '不明'))
        report.append({'area': k, 'room': AREAS[k]['room'], 'src': os.path.basename(it['path']),
                       'bpm': round(it['bpm'], 1), 'target_bpm': AREAS[k]['bpm'],
                       'title_hits': hits, 'sec': round(duration(dst)), 'mb': round(mb, 1),
                       'seam_db': round(seam, 1) if seam is not None else None,
                       'loop_fixed': fixed,
                       'trimmed_silence_sec': it['sil']})
    if spare:
        print('\n  使わなかった曲（各部屋1曲のため）:')
        for it in spare:
            print('    ' + os.path.basename(it['path']))
    with open(os.path.join(a.outdir, '_report.json'), 'w', encoding='utf-8') as fp:
        json.dump(report, fp, ensure_ascii=False, indent=1)
    print('\n完了。%s に書き出しました。' % a.outdir)


if __name__ == '__main__':
    main()
