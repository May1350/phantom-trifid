#!/bin/bash
# scripts/auto-sync.sh

echo "------------------------------------------------"
echo "🔄 A Auto-Sync Started"
echo "GitHub로 자동 업데이트를 시작합니다. (1분마다 체크)"
echo "종료하려면 Ctrl+C를 누르세요."
echo "------------------------------------------------"

while true; do
  # 변경사항이 있는지 확인
  if [[ -n $(git status -s) ]]; then
    echo "📝 변경사항 감지! GitHub에 반영 중..."
    git add .
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
    
    if [ $? -eq 0 ]; then
      echo "✅ 업데이트 완료! (Railway 배포가 시작됩니다)"
    else
      echo "❌ 업데이트 실패. 인터넷 연결이나 권한을 확인해주세요."
    fi
    echo "------------------------------------------------"
  fi
  
  # 1분 대기
  sleep 60
done
