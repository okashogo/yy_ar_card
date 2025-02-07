import cv2
import numpy as np
import json
import pytesseract

# 画像を読み込む
image_path = "original_yy.jpg"
image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

# ヒストグラム均等化（コントラスト調整）
image = cv2.equalizeHist(image)

# ノイズ除去（ぼかし）
image = cv2.GaussianBlur(image, (3, 3), 0)

# Cannyエッジ検出
edges = cv2.Canny(image, 50, 150)

# ORB で特徴点を抽出
orb = cv2.ORB_create(nfeatures=1000)
keypoints, descriptors = orb.detectAndCompute(image, None)

# 特徴点情報を格納
features = {
    "keypoints": [
        {"x": kp.pt[0], "y": kp.pt[1], "size": kp.size, "angle": kp.angle}
        for kp in keypoints
    ],
    "descriptors": descriptors.astype(np.uint8).tolist() if descriptors is not None else []
}

# --- 文字認識 (OCR) を追加 ---
# OCR 用の前処理（適応的閾値処理で2値化）
thresh_img = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)

# OCR 実行（bounding box を取得）
custom_config = "--psm 6 -c preserve_interword_spaces=1"
data = pytesseract.image_to_data(thresh_img, config=custom_config, output_type=pytesseract.Output.DICT)

# 文字の位置情報を格納
ocr_results = []
important_chars = {"前", "能", "見"}  # 特に重要な文字

for i in range(len(data["text"])):
    text = data["text"][i].strip()
    if text:
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        ocr_results.append({
            "text": text,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "important": text in important_chars  # 重要な文字かどうか
        })

# OCR 結果を JSON に追加
features["ocr"] = ocr_results

# JSON に保存
output_path = "features_with_ocr.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(features, f, indent=4, ensure_ascii=False)

print(f"特徴量とOCR結果を {output_path} に保存しました。")
