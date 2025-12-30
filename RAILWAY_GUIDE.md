# 🚀 Railway 배포 가이드

이 문서는 대학생 및 비개발자분들도 쉽게 따라 할 수 있도록 작성된 Railway 배포 안내서입니다.

## 1. Railway 회원가입 및 연결
1. [Railway.app](https://railway.app/)에 접속합니다.
2. **GitHub 계정**으로 로그인합니다.
3. 메인 화면에서 **"New Project"** -> **"Deploy from GitHub repo"**를 선택합니다.
4. 현재 프로젝트인 `a` 저장소를 선택합니다.
5. **"Deploy Now"**를 클릭하기 전에 잠깐! 환경 변수 설정을 먼저 해야 합니다.

## 2. 환경 변수(Variables) 설정
배포가 시작되면 브라우저 화면의 **Variables** 탭으로 가서 아래 항목들을 하나씩 추가해주세요. 
(로컬의 `server/.env` 파일에 있는 값들을 복사해서 넣으시면 됩니다.)

| Key | 설명 |
| :--- | :--- |
| `PORT` | `8080` (필수) |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | 세션 보안을 위한 임의의 문자열 |
| `GOOGLE_CLIENT_ID` | 구글 API 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 구글 API 클라이언트 시크릿 |
| `GOOGLE_DEVELOPER_TOKEN` | 구글 광고 API 개발자 토큰 |
| `META_CLIENT_ID` | 메타(페이스북) 앱 ID |
| `META_CLIENT_SECRET` | 메타 앱 시크릿 |

## 3. 배포 확인
1. 변수 설정이 완료되면 Railway가 자동으로 다시 빌드를 시작합니다.
2. 상단의 **"Settings"** 탭에서 **"Networking"** -> **"Generate Domain"**을 클릭하면 실제 접속 가능한 URL이 생성됩니다.
3. 생성된 URL로 접속하여 서비스가 잘 나오는지 확인합니다!

## 4. 수정사항 반영하기 (가장 중요한 부분!)
컴퓨터에서 코드를 수정한 후, **GitHub에 Push**만 하세요.
```bash
git add .
git commit -m "수정 내용 설명"
git push origin main
```
그러면 Railway가 1초 만에 감지하고 **자동으로 새 버전을 배포**합니다. 약 2~3분 뒤에 사이트에 반영됩니다.
