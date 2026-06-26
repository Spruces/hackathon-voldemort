#!/bin/bash
# 캐치테이블 time-slots 자동 수집 스크립트
#
# 사용법:
#   chmod +x scripts/cron-collect.sh
#   ./scripts/cron-collect.sh              # 수집 실행 (200곳, 8워커)
#   ./scripts/cron-collect.sh --quick      # 빠르게 (50곳, 5워커)
#   ./scripts/cron-collect.sh --install    # crontab 등록 (1시간마다)
#   ./scripts/cron-collect.sh --uninstall  # crontab 해제

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="/tmp/ct-test/bin/python3"
SCRIPT_PATH="$DIR/scripts/cron-collect.sh"
LOG_DIR="$DIR/logs"
CRON_MARKER="# catchtable-timeslots-collector"

# --- crontab 설치/해제 ---
if [ "$1" = "--install" ]; then
  CRON_JOB="0 * * * * $SCRIPT_PATH $CRON_MARKER"
  # 이미 등록되어 있으면 스킵
  if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
    echo "✅ 이미 등록됨"
    crontab -l | grep "$CRON_MARKER"
  else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ crontab 등록 완료 (매 정각 실행)"
    echo "   $CRON_JOB"
  fi
  exit 0
fi

if [ "$1" = "--uninstall" ]; then
  if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
    crontab -l | grep -v "$CRON_MARKER" | crontab -
    echo "✅ crontab 해제 완료"
  else
    echo "등록된 작업 없음"
  fi
  exit 0
fi

# --- 수집 실행 ---
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/collect_${TIMESTAMP}.log"

RESTAURANTS=200
WORKERS=8

if [ "$1" = "--quick" ]; then
  RESTAURANTS=50
  WORKERS=5
fi

echo "[$TIMESTAMP] 수집 시작: ${RESTAURANTS}곳, ${WORKERS}워커" | tee "$LOG_FILE"

# 1. 세션 쿠키 유효성 확인
if [ -f "$DIR/.catchtable-cookies.json" ]; then
  echo "  쿠키 파일 존재" | tee -a "$LOG_FILE"
else
  echo "  ⚠️ 쿠키 없음 — 인증 실행" | tee -a "$LOG_FILE"
  $VENV "$DIR/scripts/catchtable-auth.py" >> "$LOG_FILE" 2>&1
fi

# 2. time-slots 크롤링
echo "  크롤링 시작..." | tee -a "$LOG_FILE"
$VENV "$DIR/scripts/catchtable-timeslots-worker.py" \
  --restaurants "$RESTAURANTS" \
  --workers "$WORKERS" \
  --headless \
  >> "$LOG_FILE" 2>&1

# 3. 결과
RESULT=$(grep "완료" "$LOG_FILE" | tail -1)
echo "  $RESULT" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] 수집 종료" | tee -a "$LOG_FILE"

# 4. 오래된 로그 정리 (7일)
find "$LOG_DIR" -name "collect_*.log" -mtime +7 -delete 2>/dev/null || true
