#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""やわらかい仮BGMを作る道具（オルゴールとふんわりした音だけ）。

方針
  ・和楽器・打楽器・ロックの音は使わない。サイン波だけのやさしい音にする
  ・部屋ごとにテンポ・調・和音の並びを変える（指示文と同じ値）
  ・8小節でぴったり終わるので、くり返しても切れ目が分からない
  ・最後に音量を -16 LUFS にそろえる（本番の曲と同じ大きさ）

使い方
  python3 tools/make-bgm.py 出力フォルダ [--seconds 96]
"""
import argparse, os, subprocess, tempfile
import numpy as np

SR = 44100

# 部屋ごとの設定。key=主音のMIDI番号、prog=和音の度数（0基準の半音）
AREAS = {
    'A': dict(bpm=92,  key=60, prog=[0, 7, 9, 5],  bell=1.0, pad=0.5, room='おしゃべり'),
    'B': dict(bpm=85,  key=53, prog=[0, 5, 7, 5],  bell=0.8, pad=0.6, room='おまかせ'),
    'C': dict(bpm=100, key=62, prog=[0, 9, 5, 7],  bell=1.0, pad=0.4, room='いろどり'),
    'D': dict(bpm=72,  key=57, prog=[0, 3, 8, 5],  bell=0.6, pad=0.8, room='じぶん専用'),
    'E': dict(bpm=80,  key=52, prog=[0, 3, 10, 5], bell=0.5, pad=0.9, room='あいぼう'),
    'F': dict(bpm=108, key=55, prog=[0, 5, 9, 7],  bell=1.0, pad=0.4, room='ものづくり'),
    'G': dict(bpm=96,  key=58, prog=[0, 7, 5, 9],  bell=0.9, pad=0.6, room='つながり'),
    'H': dict(bpm=66,  key=53, prog=[0, 9, 5, 7],  bell=0.7, pad=0.9, room='おるすばん'),
}
MAJ = [0, 4, 7, 11, 14]     # 和音に使う音（長7度まで＝やさしい響き）


def midi_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12.0)


def bell(freq, dur, amp=0.2):
    """オルゴールの音。倍音を少し混ぜて、すぐ減衰させる。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t * 3.4)
    w = (np.sin(2 * np.pi * freq * t) * 1.0
         + np.sin(2 * np.pi * freq * 2 * t) * 0.28
         + np.sin(2 * np.pi * freq * 3 * t) * 0.08)
    return (w * env * amp).astype(np.float32)


def pad(freqs, dur, amp=0.06):
    """ふんわりした和音。ゆっくり出てゆっくり消える。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    fade = np.minimum(1.0, t / (dur * 0.35)) * np.minimum(1.0, (dur - t) / (dur * 0.4))
    out = np.zeros(n, dtype=np.float32)
    for f in freqs:
        vib = 1.0 + 0.0015 * np.sin(2 * np.pi * 4.5 * t)     # かすかな揺れ
        out += np.sin(2 * np.pi * f * t * vib).astype(np.float32)
    return (out / len(freqs) * fade * amp).astype(np.float32)


def add(buf, sig, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[:j - i]


def reverb(x, decay=1.6, mix=0.28):
    """かんたんな残響。短いノイズの尾を畳み込む。"""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    ir = (np.random.default_rng(7).normal(0, 1, n) * np.exp(-t * (3.0 / decay))).astype(np.float32)
    ir[0] = 1.0
    wet = np.convolve(x, ir / np.abs(ir).sum() * 3.0, mode='full')[:len(x)]
    return ((1 - mix) * x + mix * wet).astype(np.float32)


def make(area, seconds):
    cfg = AREAS[area]
    beat = 60.0 / cfg['bpm']
    bar = beat * 4
    bars = max(8, int(round(seconds / bar / 8)) * 8)     # 8小節の倍数
    total = bar * bars
    buf = np.zeros(int(total * SR) + SR, dtype=np.float32)
    rng = np.random.default_rng(ord(area))

    for b in range(bars):
        root = cfg['key'] + cfg['prog'][b % len(cfg['prog'])]
        chord = [midi_hz(root - 12 + iv) for iv in (0, 4, 7)]
        add(buf, pad(chord, bar * 1.02, amp=0.075 * cfg['pad']), b * bar)

        # オルゴールの旋律（和音の中の音だけを選ぶので外れない）
        steps = 8
        for s in range(steps):
            if rng.random() < 0.22:      # ときどき休む
                continue
            iv = MAJ[rng.integers(0, len(MAJ))]
            oct_up = 12 * int(rng.integers(1, 3))
            f = midi_hz(root + iv + oct_up)
            amp = 0.16 * cfg['bell'] * (0.75 + 0.25 * rng.random())
            add(buf, bell(f, min(1.6, beat * 2), amp), b * bar + s * (bar / steps))

        # 低い音を1小節に1回だけ、そっと置く
        add(buf, bell(midi_hz(root - 24), bar * 0.9, 0.10), b * bar)

    buf = buf[:int(total * SR)]
    buf = reverb(buf)
    # 端をつなぐ（頭0.4秒を最後に重ねる＝くり返しの切れ目を消す）
    x = int(0.4 * SR)
    fade = np.linspace(0, 1, x, dtype=np.float32)
    buf[-x:] = buf[-x:] * (1 - fade) + buf[:x] * fade
    peak = np.abs(buf).max()
    if peak > 0:
        buf = buf / peak * 0.85
    return buf


def write_mp3(buf, path):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        wav = tf.name
    import wave
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(buf, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav,
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,lowpass=f=9000',
                    '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '160k', path], check=True)
    os.unlink(wav)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('outdir')
    ap.add_argument('--seconds', type=int, default=96)
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)
    for k in 'ABCDEFGH':
        buf = make(k, a.seconds)
        p = os.path.join(a.outdir, k + '.mp3')
        write_mp3(buf, p)
        print('  %s（%sルーム） %3d BPM  %4.0f秒 %5.0fKB'
              % (k, AREAS[k]['room'], AREAS[k]['bpm'], len(buf) / SR, os.path.getsize(p) / 1024))


if __name__ == '__main__':
    main()
