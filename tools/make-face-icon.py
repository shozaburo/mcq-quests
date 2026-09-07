#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""立ち絵から「顔アイコン」を切り出す道具。

なぜ必要か
  スタンプ演出や街の名札に使う丸い顔アイコンは、立ち絵とは別に用意する。
  用意し忘れると、別人の絵が出てしまう（実際に起きた）。

やりかた
  1. 透明でない部分の外枠を求める
  2. 上から数えて高さの何割か（既定36%）を正方形で切る
  3. 顔の左右の中心は、上の方の行の重心から決める
  4. WebPで書き出す（480px）

使い方
  python3 tools/make-face-icon.py 立ち絵.webp 出力.webp [--ratio 0.36]
  python3 tools/make-face-icon.py --batch フォルダ 出力フォルダ
"""
import argparse, glob, os
import numpy as np
from PIL import Image


def face_icon(path, ratio=0.36, size=480, offset=0.0, cx=None):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im.getchannel('A'))
    ys, xs = np.nonzero(a > 40)
    if not len(ys):
        return im.resize((size, size), Image.LANCZOS)
    top, bottom = ys.min(), ys.max()
    h = bottom - top
    side = int(h * ratio)
    top = top + int(h * offset)                       # 顔の位置に合わせて下げる
    band = a[top:top + max(4, side // 2), :]          # 顔のあたりの帯
    cols = np.nonzero(band.sum(axis=0) > 0)[0]
    if cx is not None:
        left, right = xs.min(), xs.max()
        cxpix = int(left + (right - left) * cx)       # 左右の位置を割合で指定
    else:
        cxpix = int(cols.mean()) if len(cols) else im.width // 2
    cx = cxpix
    x0 = max(0, min(im.width - side, cx - side // 2))
    y0 = max(0, top - int(side * 0.06))                # 少し上に余白
    face = im.crop((x0, y0, x0 + side, y0 + side)).resize((size, size), Image.LANCZOS)
    # 背景を白っぽく敷く（丸く切られるので、透明のままだと暗く見える）
    base = Image.new('RGBA', (size, size), (255, 253, 246, 255))
    base.alpha_composite(face)
    return base.convert('RGB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--batch', action='store_true')
    ap.add_argument('--ratio', type=float, default=0.36)
    ap.add_argument('--offset', type=float, default=0.0, help='上からどれだけ下げて切るか（高さに対する割合）')
    ap.add_argument('--cx', type=float, default=None, help='顔の左右の位置（0=左端 0.5=中央 1=右端）')
    ap.add_argument('--quality', type=int, default=88)
    a = ap.parse_args()
    if a.batch:
        os.makedirs(a.dst, exist_ok=True)
        for f in sorted(glob.glob(os.path.join(a.src, '[A-H].webp'))):
            out = os.path.join(a.dst, os.path.splitext(os.path.basename(f))[0] + '_icon.webp')
            face_icon(f, a.ratio, offset=a.offset, cx=a.cx).save(out, 'WEBP', quality=a.quality, method=6)
            print('  %-12s → %-18s %5.1fKB' % (os.path.basename(f), os.path.basename(out),
                                               os.path.getsize(out) / 1024))
    else:
        face_icon(a.src, a.ratio, offset=a.offset, cx=a.cx).save(a.dst, 'WEBP', quality=a.quality, method=6)
        print('%s → %s' % (a.src, a.dst))


if __name__ == '__main__':
    main()
