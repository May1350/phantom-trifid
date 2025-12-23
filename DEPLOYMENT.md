# Phantom Trifid - GCP Cloud Run 배포 가이드

이 문서는 개발 지식이 없는 사용자도 따라할 수 있도록 단계별로 작성되었습니다. 각 단계를 순서대로 따라하시면 됩니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [GCP 초기 설정](#gcp-초기-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [배포 실행](#배포-실행)
5. [배포 확인](#배포-확인)
6. [문제 해결](#문제-해결)
7. [비용 관리](#비용-관리)

---

## 사전 준비

### 1. Google Cloud Platform 계정 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다
2. Google 계정으로 로그인합니다
3. 신용카드 정보를 등록합니다 (무료 크레딧 $300 제공)
   - 소규모 운영 시 거의 비용이 발생하지 않습니다
   - 무료 티어 범위 내에서 사용 가능합니다

### 2. gcloud CLI 설치

**macOS 사용자:**

```bash
# Homebrew를 사용하여 설치
brew install --cask google-cloud-sdk

# 설치 후 초기화
gcloud init
```

**설치 확인:**

```bash
gcloud --version
```

성공적으로 설치되면 버전 정보가 출력됩니다.

### 3. Docker 설치

**macOS 사용자:**

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop) 다운로드
2. 다운로드한 `.dmg` 파일 실행
3. Docker 아이콘을 Applications 폴더로 드래그
4. Docker Desktop 실행

**설치 확인:**

```bash
docker --version
```

---

## GCP 초기 설정

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다:

```bash
./scripts/setup-gcp.sh
```

이 스크립트는 다음 작업을 자동으로 수행합니다:

1. ✅ GCP 로그인
2. ✅ 프로젝트 생성 또는 선택
3. ✅ 필요한 API 활성화
   - Cloud Run API
   - Cloud Build API
   - Container Registry API
   - Secret Manager API
   - Cloud Storage API
4. ✅ 서비스 계정 생성 및 권한 설정
5. ✅ Cloud Storage 버킷 생성 (데이터베이스용)

**중요:** 스크립트 실행 중 프로젝트에 결제 계정을 연결하라는 메시지가 나타나면, 브라우저에서 연결을 완료한 후 Enter를 누르세요.

---

## 환경 변수 설정

### 1. 환경 변수 파일 확인

`server/.env` 파일이 이미 존재하는지 확인합니다. 없다면 `.env.example.production` 파일을 참고하여 생성합니다.

```bash
# 현재 환경 변수 확인
cat server/.env
```

### 2. 필수 환경 변수

다음 환경 변수들이 반드시 설정되어 있어야 합니다:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SESSION_SECRET` | 세션 암호화 키 | 랜덤 문자열 (아래 명령어로 생성) |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | `GOCSPX-xxxxx` |
| `GOOGLE_DEVELOPER_TOKEN` | Google Ads API 개발자 토큰 | `xxxxx` |
| `META_CLIENT_ID` | Meta (Facebook) 앱 ID | `123456789` |
| `META_CLIENT_SECRET` | Meta 앱 시크릿 | `xxxxx` |

**SESSION_SECRET 생성 방법:**

```bash
openssl rand -base64 32
```

출력된 문자열을 `SESSION_SECRET` 값으로 사용하세요.

### 3. 환경 변수 검증

배포 전에 환경 변수가 올바르게 설정되었는지 확인합니다:

```bash
./deploy.sh --check-env
```

모든 필수 변수가 설정되어 있으면 ✓ 표시가 나타납니다.

---

## 배포 실행

### 1. 로컬 테스트 (선택사항)

배포 전에 로컬에서 Docker 컨테이너를 테스트할 수 있습니다:

```bash
# Docker Compose로 실행
docker-compose up --build
```

브라우저에서 `http://localhost:8080`에 접속하여 정상 작동을 확인합니다.

테스트 완료 후:

```bash
# Ctrl+C로 중지 후
docker-compose down
```

### 2. Cloud Run에 배포

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다:

```bash
./deploy.sh
```

이 스크립트는 다음 작업을 자동으로 수행합니다:

1. ✅ 환경 변수 검증
2. ✅ Docker 이미지 빌드
3. ✅ Container Registry에 이미지 업로드
4. ✅ Secret Manager에 환경 변수 저장
5. ✅ Cloud Run에 서비스 배포

**예상 소요 시간:** 5-10분

배포가 완료되면 다음과 같은 메시지가 출력됩니다:

```
================================================
Deployment Complete!
================================================

✓ Service deployed successfully!

Service URL: https://phantom-trifid-xxxxx-an.a.run.app
```

---

## 배포 확인

### 1. 서비스 상태 확인

배포된 URL에 접속하여 서비스가 정상 작동하는지 확인합니다:

```bash
# Health check 엔드포인트 확인
curl https://your-service-url.run.app/health
```

정상적으로 작동하면 다음과 같은 응답이 나타납니다:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-23T14:36:00.000Z",
  "uptime": 123.456
}
```

### 2. 브라우저에서 확인

배포된 URL을 브라우저에서 열어 애플리케이션이 정상적으로 로드되는지 확인합니다.

### 3. GCP Console에서 확인

1. [Cloud Run Console](https://console.cloud.google.com/run)에 접속
2. `phantom-trifid` 서비스 클릭
3. 다음 정보를 확인:
   - 서비스 상태: ✓ (녹색)
   - 최근 배포 시간
   - 요청 수, 응답 시간 등 메트릭

---

## 문제 해결

### 배포 실패 시

**1. 환경 변수 누락**

```
Error: Missing required environment variables
```

**해결 방법:**
```bash
./deploy.sh --check-env
```
누락된 변수를 `server/.env` 파일에 추가합니다.

**2. Docker 빌드 실패**

```
Error: failed to build image
```

**해결 방법:**
```bash
# Docker Desktop이 실행 중인지 확인
docker ps

# 로컬에서 빌드 테스트
docker build -t test .
```

**3. GCP 권한 오류**

```
Error: Permission denied
```

**해결 방법:**
```bash
# 다시 로그인
gcloud auth login

# 프로젝트 확인
gcloud config get-value project

# 권한 확인
gcloud projects get-iam-policy $(gcloud config get-value project)
```

### 서비스 로그 확인

문제가 발생하면 Cloud Run 로그를 확인합니다:

```bash
# 최근 로그 확인
gcloud run services logs read phantom-trifid \
  --region=asia-northeast3 \
  --limit=50
```

또는 [Cloud Console Logs](https://console.cloud.google.com/logs)에서 확인할 수 있습니다.

### 일반적인 문제

**CORS 오류**

프론트엔드에서 API 호출 시 CORS 오류가 발생하면:

1. Cloud Run 서비스의 환경 변수에 `FRONTEND_URL` 추가:
   ```bash
   gcloud run services update phantom-trifid \
     --region=asia-northeast3 \
     --set-env-vars="FRONTEND_URL=https://your-frontend-url.com"
   ```

**데이터베이스 초기화**

데이터베이스가 비어있거나 손상된 경우:

```bash
# 로컬 database.json을 Cloud Storage에 업로드
gsutil cp server/database.json gs://your-project-id-database/database.json
```

---

## 비용 관리

### 무료 티어 범위

Cloud Run은 다음 범위까지 무료입니다:

- **요청:** 월 200만 요청
- **컴퓨팅 시간:** 월 360,000 vCPU-초
- **메모리:** 월 180,000 GiB-초
- **네트워크:** 월 1GB 아웃바운드

**소규모 운영 시 예상 비용:** $0 ~ $5/월

### 비용 최적화 팁

1. **최소 인스턴스 수를 0으로 설정** (이미 설정됨)
   - 요청이 없을 때 인스턴스가 자동으로 종료됩니다
   - Cold start가 발생할 수 있지만 비용이 절감됩니다

2. **메모리 및 CPU 최적화**
   - 현재 설정: 512Mi 메모리, 1 CPU
   - 트래픽이 적으면 충분합니다

3. **비용 알림 설정**
   ```bash
   # GCP Console에서 설정
   # Billing > Budgets & alerts
   # 예: 월 $10 초과 시 이메일 알림
   ```

4. **사용량 모니터링**
   - [Cloud Run 대시보드](https://console.cloud.google.com/run)에서 실시간 모니터링
   - 요청 수, 응답 시간, 오류율 확인

### 비용 확인

현재까지 발생한 비용 확인:

```bash
# 브라우저에서 확인
open https://console.cloud.google.com/billing
```

---

## 업데이트 배포

코드를 수정한 후 다시 배포하려면:

```bash
# 간단하게 다시 실행
./deploy.sh
```

새로운 버전이 자동으로 배포되며, 무중단 배포(Zero-downtime deployment)가 적용됩니다.

---

## 추가 리소스

- [Cloud Run 공식 문서](https://cloud.google.com/run/docs)
- [GCP 무료 티어](https://cloud.google.com/free)
- [Docker 공식 문서](https://docs.docker.com/)
- [gcloud CLI 참조](https://cloud.google.com/sdk/gcloud/reference)

---

## 지원

문제가 발생하거나 도움이 필요하면:

1. 이 문서의 [문제 해결](#문제-해결) 섹션을 확인하세요
2. Cloud Run 로그를 확인하세요
3. GCP 지원팀에 문의하세요 (무료 티어 사용자도 커뮤니티 지원 가능)

---

**축하합니다! 🎉**

Phantom Trifid가 성공적으로 배포되었습니다. 이제 전 세계 어디서나 서비스에 접속할 수 있습니다.
