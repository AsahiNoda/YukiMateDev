#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_japan_resorts_homemate.py
- Homemate Research (https://www.homemate-research-ski.com/search-list/) からスキー場一覧を取得
- 取得した名称と都道府県を元に Nominatim で lat/lon を取得
- 出力: resorts.csv と resorts.sql
- 使い方: python generate_japan_resorts_homemate.py
"""

import requests
import time
import csv
import re
import sys
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

# -------- CONFIG ----------
USER_AGENT = "YukiMateResortImporter/2.0 (nodasy0855@gmail.com)"
OUTPUT_CSV = "resorts.csv"
OUTPUT_SQL = "resorts.sql"

TARGET_URL = "https://www.homemate-research-ski.com/search-list/"

# Nominatim endpoints
NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"

HEADERS = {"User-Agent": USER_AGENT}

# 都道府県名(JP) -> 英語名(EN) マッピング
# これを使って Region を決定します
PREF_JP_TO_EN = {
    "北海道": "Hokkaido",
    "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi", "秋田県": "Akita", "山形県": "Yamagata", "福島県": "Fukushima",
    "茨城県": "Ibaraki", "栃木県": "Tochigi", "群馬県": "Gunma", "埼玉県": "Saitama", "千葉県": "Chiba", "東京都": "Tokyo", "神奈川県": "Kanagawa",
    "新潟県": "Niigata", "富山県": "Toyama", "石川県": "Ishikawa", "福井県": "Fukui", "山梨県": "Yamanashi", "長野県": "Nagano", "岐阜県": "Gifu", "静岡県": "Shizuoka", "愛知県": "Aichi",
    "三重県": "Mie", "滋賀県": "Shiga", "京都府": "Kyoto", "大阪府": "Osaka", "兵庫県": "Hyogo", "奈良県": "Nara", "和歌山県": "Wakayama",
    "鳥取県": "Tottori", "島根県": "Shimane", "岡山県": "Okayama", "広島県": "Hiroshima", "山口県": "Yamaguchi",
    "徳島県": "Tokushima", "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi",
    "福岡県": "Fukuoka", "佐賀県": "Saga", "長崎県": "Nagasaki", "熊本県": "Kumamoto", "大分県": "Oita", "宮崎県": "Miyazaki", "鹿児島県": "Kagoshima", "沖縄県": "Okinawa"
}

# Prefecture(EN) -> Region(EN) map
PREF_EN_TO_REGION = {
    "Hokkaido": "Hokkaido",
    "Aomori":"Tohoku","Iwate":"Tohoku","Miyagi":"Tohoku","Akita":"Tohoku","Yamagata":"Tohoku","Fukushima":"Tohoku",
    "Ibaraki":"Kanto","Tochigi":"Kanto","Gunma":"Kanto","Saitama":"Kanto","Chiba":"Kanto","Tokyo":"Kanto","Kanagawa":"Kanto",
    "Niigata":"Chubu","Toyama":"Chubu","Ishikawa":"Chubu","Fukui":"Chubu","Yamanashi":"Chubu","Nagano":"Chubu","Gifu":"Chubu","Shizuoka":"Chubu","Aichi":"Chubu",
    "Mie":"Kansai","Shiga":"Kansai","Kyoto":"Kansai","Osaka":"Kansai","Hyogo":"Kansai","Nara":"Kansai","Wakayama":"Kansai",
    "Tottori":"Chugoku","Shimane":"Chugoku","Okayama":"Chugoku","Hiroshima":"Chugoku","Yamaguchi":"Chugoku",
    "Tokushima":"Shikoku","Kagawa":"Shikoku","Ehime":"Shikoku","Kochi":"Shikoku",
    "Fukuoka":"Kyushu","Saga":"Kyushu","Nagasaki":"Kyushu","Kumamoto":"Kyushu","Oita":"Kyushu","Miyazaki":"Kyushu","Kagoshima":"Kyushu","Okinawa":"Okinawa"
}

# -------- Helpers ----------

def scrape_homemate_resorts() -> List[Dict]:
    """
    ホームメイト・リサーチのスキー場一覧ページをスクレイピングし、
    {name: 施設名, pref: 都道府県名} のリストを返す。
    """
    print(f"Fetching {TARGET_URL} ...")
    try:
        resp = requests.get(TARGET_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error fetching URL: {e}")
        sys.exit(1)

    soup = BeautifulSoup(resp.text, "html.parser")
    
    resorts = []
    current_pref = ""
    
    # ページ内のすべてのリンクタグを走査し、その直前のヘッダー（都道府県名）をコンテキストとして利用する手法
    # または、ドキュメントの並び順でヘッダー検出 -> リスト検出を行う
    
    # ホームメイトの構造上、都道府県名は h3, h4, または特定のクラスの要素と思われる。
    # ここでは汎用的に、HTML内の全要素を上から順に見て、都道府県名が出てきたらコンテキストを切り替える方式をとる。
    
    # 探索対象のタグ（ヘッダーになりうるもの + リンク）
    all_tags = soup.find_all(['h3', 'h4', 'h5', 'li', 'dt', 'dd', 'div', 'span', 'a'])
    
    # 都道府県名のセット（検索用）
    known_prefs = set(PREF_JP_TO_EN.keys())
    
    seen_names = set()

    for tag in all_tags:
        text = tag.get_text(strip=True)
        
        # 1. ヘッダー判定: テキストが都道府県名で始まるかチェック
        # "北海道（117施設）" のような形式に対応
        # "北海道・東北地方" のようなリージョンヘッダーは除外したい（都道府県単位で取りたいため）
        # -> 都道府県名 + ("（", "(", " ", 行末) のパターンを確認
        matched_pref = None
        for p in known_prefs:
            if text.startswith(p):
                # 都道府県名の直後が以下の文字、または文字列終了であれば都道府県ヘッダーとみなす
                suffix = text[len(p):]
                if not suffix or suffix[0] in ['（', '(', ' ', '\u3000'] or suffix == "施設":
                    matched_pref = p
                    break
        
        if matched_pref:
            current_pref = matched_pref
            continue
        
        # 2. 施設リンク判定
        if tag.name == 'a' and current_pref:
            href = tag.get('href', '')
            # 除外ワード
            if any(x in text for x in ["投稿", "検索", "一覧", "ホームメイト", "トップ", "運営", "会社", "概要", "マップ", "地図"]):
                continue
            
            # テキストが極端に短い、あるいは記号のみの場合は除外
            if len(text) < 2:
                continue

            # 写真枚数表記（例: " 5枚"）を削除
            # 行末にある数字+枚を削除
            clean_name = re.sub(r'\s*\d+枚.*$', '', text)
            clean_name = clean_name.strip()
            
            if not clean_name:
                continue
                
            # 重複排除
            if clean_name in seen_names:
                continue
            
            # 明らかに施設名っぽくないものを除外（念のため）
            if clean_name in known_prefs: 
                continue

            seen_names.add(clean_name)
            
            resorts.append({
                "name": clean_name,
                "pref": current_pref
            })

    print(f"Found {len(resorts)} resorts from the page.")
    return resorts

def nominatim_search(name: str, pref: str) -> Optional[Dict]:
    """
    施設名 + 都道府県名で検索を行う。
    """
    q = f"{name}, {pref}, Japan"
    params = {
        "q": q,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1
    }
    try:
        r = requests.get(NOMINATIM_SEARCH, params=params, headers=HEADERS, timeout=30)
        r.raise_for_status()
        arr = r.json()
        if arr:
            return arr[0]
        
        # 見つからない場合、都道府県なしで再トライ（あるいは施設名のみ）
        # ただし精度が落ちるため、まずは名前だけでリトライ
        time.sleep(1.1)
        params["q"] = f"{name}, Japan"
        r = requests.get(NOMINATIM_SEARCH, params=params, headers=HEADERS, timeout=30)
        r.raise_for_status()
        arr = r.json()
        if arr:
            return arr[0]
            
        return None
    except Exception as e:
        print(f"Nominatim error for {name}: {e}")
        return None

def main():
    # 1. スクレイピング
    resorts = scrape_homemate_resorts()
    if not resorts:
        print("No resorts found. Exiting.")
        sys.exit(1)

    rows = []
    count = 0
    total = len(resorts)
    
    print(f"Starting geocoding for {total} resorts...")

    for r in resorts:
        count += 1
        name = r["name"]
        pref = r["pref"]
        
        print(f"[{count}/{total}] Processing: {name} ({pref})")
        
        # ジオコーディング
        ge = nominatim_search(name, pref)
        time.sleep(1.1) # Nominatim Policy (1 request per sec)

        lat = lon = ""
        
        if ge:
            lat = ge.get("lat", "")
            lon = ge.get("lon", "")
        else:
            print(f"  -> Geocode failed for {name}")

        # Region の解決
        pref_en = PREF_JP_TO_EN.get(pref, "")
        region = PREF_EN_TO_REGION.get(pref_en, "")

        row = {
            "name": name,
            "area": pref,          # 日本語の都道府県名を入れる（ご要望のSQL例に合わせる）
            "region": region,      # 英語の地方名 (Hokkaido, Tohoku, etc.)
            "latitude": lat,
            "longitude": lon,
            "official_site_url": "",
            "pricing_url": "",
            "night_ski": False,
            "difficulty_dist": "{}",
            "map_image_url": ""
        }
        rows.append(row)

    # CSV出力
    fieldnames = ["name","area","region","latitude","longitude","official_site_url","pricing_url","night_ski","difficulty_dist","map_image_url"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            # Noneを空文字に変換して書き込み
            writer.writerow({k: (v if v is not None else "") for k,v in r.items()})

    # SQL出力
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- Generated resorts insert from Homemate data\n")
        for r in rows:
            def esc(s):
                if s is None or s == "":
                    return "NULL"
                if isinstance(s, bool):
                    return 'true' if s else 'false'
                return "'" + str(s).replace("'", "''") + "'"
            
            lat_sql = r["latitude"] if r["latitude"] != "" else "NULL"
            lon_sql = r["longitude"] if r["longitude"] != "" else "NULL"
            
            sql = (
                "INSERT INTO resorts (name, area, region, latitude, longitude, official_site_url, pricing_url, night_ski, difficulty_dist, map_image_url, created_at, updated_at) VALUES ("
                + esc(r["name"]) + ", "
                + esc(r["area"]) + ", "
                + esc(r["region"]) + ", "
                + str(lat_sql) + ", "
                + str(lon_sql) + ", "
                + esc(r["official_site_url"]) + ", "
                + esc(r["pricing_url"]) + ", "
                + ("true" if r["night_ski"] else "false") + ", "
                + esc(r["difficulty_dist"]) + ", "
                + esc(r["map_image_url"]) + ", now(), now());\n"
            )
            f.write(sql)

    print("Done. Wrote", OUTPUT_CSV, "and", OUTPUT_SQL)

if __name__ == "__main__":
    main()