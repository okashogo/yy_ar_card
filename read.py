import cv2
import numpy as np
import json

# 画像を読み込む
image_path = "original_yy.jpg"
image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

# 前処理: ヒストグラム均等化 + Cannyエッジ
image = cv2.equalizeHist(image)  # コントラスト調整
image = cv2.GaussianBlur(image, (3, 3), 0)  # ノイズ除去
image = cv2.Canny(image, 50, 150)  # Cannyエッジ検出

# ORB を使用して特徴点を抽出
orb = cv2.ORB_create(nfeatures=1000)
keypoints, descriptors = orb.detectAndCompute(image, None)

# 特徴点を JSON 形式に変換
features = {
    "keypoints": [
        {"x": kp.pt[0], "y": kp.pt[1], "size": kp.size, "angle": kp.angle}
        for kp in keypoints
    ],
    "descriptors": descriptors.astype(np.uint8).tolist() if descriptors is not None else []
}

# JSON ファイルに保存
output_path = "features.json"
with open(output_path, "w") as f:
    json.dump(features, f, indent=4)

print(f"特徴量を {output_path} に保存しました。")
