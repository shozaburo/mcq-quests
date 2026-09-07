#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""切り抜き画像の「ギザギザ（ジャギー）」をなくす道具。

なぜ必要か
  もらった立ち絵は、背景を切り抜いたときに「透明」か「不透明」の2段階しか
  持っていない（半透明のふちが1画素もない）。だから斜めの輪郭が階段状に見える。
  さらに、切り抜きぎわに元の背景の白がわずかに残るので、白いふちにも見える。

なにをするか
  1. 透明のふちを1画素ほど内側に削る（残った背景の色を捨てる）
  2. 削ったふちをぼかして、半透明のなめらかなふちを作る
  3. 透明な部分の色を、中の色でにじませる（ぼかしたふちが白くならないように）
  4. WebPで書き出す（透明度は元のまま保たれ、PNGより10分の1近く軽い）

使い方
  python3 tools/soften-cutout.py 入力.png 出力.webp [--erode 1.2] [--feather 1.0] [--quality 90] [--maxside 1000]
  python3 tools/soften-cutout.py --batch 入力フォルダ 出力フォルダ
"""
import argparse, glob, os, sys
from PIL import Image, ImageFilter


def soften(im, erode=1.2, feather=1.0):
    """透明・不透明の2段階しかない切り抜きに、半透明のなめらかなふちを作る。

    1) ふちを内側に削る（切り抜きに残った元の背景の色を捨てる）
    2) 削ったふちをぼかす（半透明のふちができる＝ギザギザが消える）
    3) 透明な部分の色を中の色でにじませる（ぼかしたふちが白くならない）
    """
    import numpy as np
    im = im.convert('RGBA')
    arr = np.asarray(im)
    a = Image.fromarray(arr[..., 3], 'L')

    shrunk = a.filter(ImageFilter.GaussianBlur(erode)).point(lambda v: 255 if v >= 200 else 0)
    soft = shrunk.filter(ImageFilter.GaussianBlur(feather))

    hard = np.asarray(a).astype(np.float32) / 255.0
    hard = (hard >= 0.5).astype(np.float32)
    rgb = arr[..., :3].astype(np.float32) / 255.0
    prem = Image.fromarray((np.clip(rgb * hard[..., None], 0, 1) * 255).astype(np.uint8), 'RGB')
    wimg = Image.fromarray((hard * 255).astype(np.uint8), 'L')
    R = max(3.0, feather * 3)
    pb = np.asarray(prem.filter(ImageFilter.GaussianBlur(R))).astype(np.float32) / 255.0
    wb = np.asarray(wimg.filter(ImageFilter.GaussianBlur(R))).astype(np.float32) / 255.0
    spread = np.where(wb[..., None] > 0.03, pb / np.maximum(wb[..., None], 1e-6), rgb)
    outrgb = np.where(hard[..., None] > 0.5, rgb, np.clip(spread, 0, 1))
    out = np.concatenate([outrgb, (np.asarray(soft).astype(np.float32) / 255.0)[..., None]], axis=2)
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')


def rescale(im, target_long):
    """透明の縁が濁らないように、色×不透明度（プリマルチプライ）で拡大縮小する。"""
    if not target_long:
        return im
    cur = max(im.size)
    if cur == target_long:
        return im
    import numpy as np
    sc = target_long / cur
    size = (max(1, round(im.width * sc)), max(1, round(im.height * sc)))
    arr = np.asarray(im).astype(np.float32) / 255.0
    a = arr[..., 3:4]
    prem = np.clip(arr[..., :3] * a, 0, 1)
    pim = Image.fromarray((prem * 255).astype(np.uint8), 'RGB').resize(size, Image.LANCZOS)
    aim = Image.fromarray((a[..., 0] * 255).astype(np.uint8), 'L').resize(size, Image.LANCZOS)
    p2 = np.asarray(pim).astype(np.float32) / 255.0
    a2 = np.asarray(aim).astype(np.float32) / 255.0
    with np.errstate(divide='ignore', invalid='ignore'):
        rgb = np.where(a2[..., None] > 0.02, p2 / np.maximum(a2[..., None], 1e-6), 0.0)
    out = np.concatenate([np.clip(rgb, 0, 1), a2[..., None]], axis=2)
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')


def trim_and_resize(im, maxside=0, trim=False):
    if trim:   # 既定では切り詰めない（画面の中の大きさが変わってしまうため）
        bbox = im.getchannel('A').point(lambda v: 255 if v > 4 else 0).getbbox()
        if bbox:
            im = im.crop(bbox)
    if maxside and max(im.size) > maxside:
        sc = maxside / max(im.size)
        im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    return im


def convert(src, dst, erode, feather, quality, maxside, trim=False, upscale=0):
    im = Image.open(src).convert('RGBA')
    if upscale:
        im = rescale(im, upscale)      # 先に大きくしてから、ふちをなめらかにする
    im = soften(im, erode, feather)
    im = trim_and_resize(im, maxside, trim)
    im.save(dst, 'WEBP', quality=quality, method=6, alpha_quality=100)
    return im.size, os.path.getsize(dst)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--batch', action='store_true')
    ap.add_argument('--erode', type=float, default=1.2)
    ap.add_argument('--feather', type=float, default=1.0)
    ap.add_argument('--quality', type=int, default=90)
    ap.add_argument('--maxside', type=int, default=1000)
    ap.add_argument('--trim', action='store_true', help='まわりの透明な余白を切り詰める')
    ap.add_argument('--upscale', type=int, default=0, help='長い辺をこの大きさにそろえる（拡大も縮小もする）')
    a = ap.parse_args()
    if a.batch:
        os.makedirs(a.dst, exist_ok=True)
        files = sorted(glob.glob(os.path.join(a.src, '*.png')))
        for f in files:
            out = os.path.join(a.dst, os.path.splitext(os.path.basename(f))[0] + '.webp')
            size, n = convert(f, out, a.erode, a.feather, a.quality, a.maxside, a.trim, a.upscale)
            print('  %-18s → %-18s %sx%s %6.1fKB' % (os.path.basename(f), os.path.basename(out),
                                                     size[0], size[1], n / 1024))
    else:
        size, n = convert(a.src, a.dst, a.erode, a.feather, a.quality, a.maxside, a.trim, a.upscale)
        print('%s → %s %sx%s %.1fKB' % (a.src, a.dst, size[0], size[1], n / 1024))


if __name__ == '__main__':
    main()
