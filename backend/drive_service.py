import os
import io
import json

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
from dotenv import load_dotenv

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def get_drive_service():
    try:
        google_credentials = os.getenv("GOOGLE_CREDENTIALS")

        if not google_credentials:
            raise Exception("GOOGLE_CREDENTIALS environment variable not set")

        # ---------------------------------------------------
        # CASE 1: Environment variable contains full JSON
        # (Render deployment)
        # ---------------------------------------------------
        if google_credentials.strip().startswith("{"):
            credentials_info = json.loads(google_credentials)

            creds = service_account.Credentials.from_service_account_info(
                credentials_info,
                scopes=SCOPES
            )

        # ---------------------------------------------------
        # CASE 2: Environment variable contains filename
        # (Local development)
        # ---------------------------------------------------
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            credentials_path = os.path.join(base_dir, google_credentials)

            if not os.path.exists(credentials_path):
                raise Exception(f"{google_credentials} file not found")

            creds = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=SCOPES
            )

        return build("drive", "v3", credentials=creds)

    except Exception as e:
        print("❌ DRIVE AUTH ERROR:", e)
        raise e


def download_excel(file_id):
    try:
        service = get_drive_service()

        # Get file metadata
        file = service.files().get(
            fileId=file_id,
            fields="mimeType"
        ).execute()

        mime_type = file.get("mimeType")
        print("📄 File MIME:", mime_type)

        # Google Sheet → export as Excel
        if mime_type == "application/vnd.google-apps.spreadsheet":
            request = service.files().export_media(
                fileId=file_id,
                mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        else:
            request = service.files().get_media(fileId=file_id)

        # Download
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