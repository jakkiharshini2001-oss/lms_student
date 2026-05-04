from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
import io

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_drive_service():
    creds = service_account.Credentials.from_service_account_file(
        "credentials.json", scopes=SCOPES
    )
    return build('drive', 'v3', credentials=creds)


def download_excel(file_id):
    service = get_drive_service()

    # 🔍 Step 1: Check file type
    file = service.files().get(fileId=file_id, fields="mimeType").execute()
    mime_type = file.get("mimeType")

    # 🔥 Step 2: Handle Google Sheet vs normal file
    if mime_type == "application/vnd.google-apps.spreadsheet":
        # Convert Google Sheet → Excel
        request = service.files().export_media(
            fileId=file_id,
            mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    else:
        # Normal file (xlsx, pdf, etc.)
        request = service.files().get_media(fileId=file_id)

    # 🔽 Step 3: Download file
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while not done:
        _, done = downloader.next_chunk()

    fh.seek(0)
    
    print("Downloaded size:", len(fh.getvalue()))
    
    return fh