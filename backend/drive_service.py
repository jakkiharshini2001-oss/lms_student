import json
import os
import io

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']


def get_drive_service():
    try:
        # 🔥 Load from ENV instead of file
        creds_json = os.getenv("GOOGLE_CREDENTIALS")

        if not creds_json:
            raise Exception("GOOGLE_CREDENTIALS not set in environment")

        creds_dict = json.loads(creds_json)

        creds = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=SCOPES
        )

        return build('drive', 'v3', credentials=creds)

    except Exception as e:
        print("❌ DRIVE AUTH ERROR:", e)
        raise e


def download_excel(file_id):
    try:
        service = get_drive_service()

        # 🔍 Step 1: Check file type
        file = service.files().get(
            fileId=file_id,
            fields="mimeType"
        ).execute()

        mime_type = file.get("mimeType")

        print("📄 File MIME:", mime_type)

        # 🔥 Step 2: Handle Google Sheet vs normal file
        if mime_type == "application/vnd.google-apps.spreadsheet":
            request = service.files().export_media(
                fileId=file_id,
                mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        else:
            request = service.files().get_media(fileId=file_id)

        # 🔽 Step 3: Download file
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        fh.seek(0)

        print("✅ Downloaded size:", len(fh.getvalue()))

        return fh

    except Exception as e:
        print("❌ DOWNLOAD ERROR:", e)
        raise e