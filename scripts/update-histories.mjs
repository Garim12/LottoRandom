import { appendFile, readFile, rename, writeFile } from 'node:fs/promises'

const targets = ['lotto', 'pension'].map((game) => new URL(`../src/data/${game}-history.json`, import.meta.url))
const snapshots = await Promise.all(targets.map((target) => readFile(target)))
let deferred = false
try {
  await import('./update-lotto-data.mjs')
  await import('./update-pension-data.mjs')
} catch (error) {
  // 한 복권만 갱신된 상태가 저장·배포되지 않도록 수집 전 바이트를 복원합니다.
  for (const [index, target] of targets.entries()) {
    const temporary = new URL(`${target.href}.tmp`)
    await writeFile(temporary, snapshots[index])
    await rename(temporary, target)
  }
  if (error?.code !== 'LOTTERY_MAINTENANCE') throw error
  deferred = true
  console.warn(error.message)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, '### 당첨 이력 조회 보류\n\n동행복권 정기 점검으로 이번 조회를 보류했습니다. 두 복권의 기존 이력은 보존했으며, 다음 예약 실행에서 다시 확인합니다.\n')
  }
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `deferred=${deferred}\n`)
