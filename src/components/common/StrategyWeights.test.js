import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import StrategyWeights from './StrategyWeights.vue'
import { DEFAULT_STRATEGY_WEIGHTS } from '../../utils/lottoStrategies'

const render = (weights, pension = false) => renderToString(createSSRApp(StrategyWeights, { modelValue: weights, pension }))

describe('strategy weight explanations', () => {
  it('shows relative shares rather than raw weights, with accessible range controls', async () => {
    const html = await render({ ...DEFAULT_STRATEGY_WEIGHTS })
    expect(html).toContain('aria-label="학습 패턴 50% · 자주 나온 번호 25% · 오래 안 나온 번호 25%"')
    expect(html.match(/type="range"/g)).toHaveLength(4)
    expect(html).toContain('조절값 4, 반영 비율 50%')
    expect(html).toContain('사용 안 함')
    const scaled = await render({ ml: 8, frequency: 4, gap: 4, fibonacci: 0 })
    expect(scaled).toContain('aria-label="학습 패턴 50% · 자주 나온 번호 25% · 오래 안 나온 번호 25%"')
  })

  it('explains an all-zero selection without NaN or invalid percentages', async () => {
    const html = await render({ ml: 0, frequency: 0, gap: 0, fibonacci: 0 })
    expect(html).toContain('role="alert"')
    expect(html).toContain('슬라이더를 하나 이상 올려 주세요.')
    expect(html).not.toMatch(/NaN|Infinity/)
  })

  it('distinguishes pension digit shares from group shares', async () => {
    const html = await render({ ...DEFAULT_STRATEGY_WEIGHTS, fibonacci: 8 }, true)
    expect(html).toContain('aria-label="학습 패턴 25% · 자주 나온 번호 12.5% · 오래 안 나온 번호 12.5% · 수열 숫자 선호 50%"')
    expect(html).toContain('조 선택: 학습 패턴 50% · 자주 나온 번호 25% · 오래 안 나온 번호 25%')
    const onlySequence = await render({ ml: 0, frequency: 0, gap: 0, fibonacci: 10 }, true)
    expect(onlySequence).toContain('조 선택: 1~5조를 같은 확률로 선택해요.')
  })
})
