# 행운번호 생성기

로또 6/45와 연금복권 720+ 번호를 브라우저에서 무작위로 생성하는 모바일 우선 웹앱입니다. [GitHub Pages](https://garim12.github.io/LottoRandom/)에서 사용합니다.

## 기능

- 로또 1·3·5게임 생성, 개별/전체 재생성, 완전 중복 조합 방지
- 로또 번호 최대 6개 고정 및 번호 제외
- 연금복권 낱장과 동일한 6자리 번호의 1~5조 세트 생성, 부분 재생성
- 번호 복사, 저장 번호, 최근 기록 30개, 불러오기와 삭제
- 시스템 설정을 따르는 라이트/다크 모드 및 접근 가능한 모바일 UI

번호는 Web Crypto API의 `crypto.getRandomValues()`로 생성합니다. `randomInt()`는 rejection sampling으로 modulo bias를 피합니다. 번호 생성에는 `Math.random()`을 사용하지 않습니다. 저장 번호와 기록은 서버로 보내지 않고 사용 중인 브라우저의 `localStorage`에만 보관됩니다. 저장 형식은 `version: 1`을 사용하며 손상된 데이터는 안전하게 기본값으로 복구합니다.

## 기술 스택

Vue 3 Composition API, TypeScript, Vite, Tailwind CSS, Lucide Vue Next, Vitest, GitHub Actions, GitHub Pages. 라우터와 서버는 사용하지 않습니다.

## 개발

Node.js 24 이상과 npm이 필요합니다.

```sh
npm install
npm run dev
```

검증 및 production 미리보기:

```sh
npm run test
npm run typecheck
npm run build
npm run preview
```

`npm run preview`의 기본 로컬 주소에서 `/LottoRandom/` 경로를 열어 빌드 결과를 확인합니다.

## 배포

Vite의 `base`는 `/LottoRandom/`입니다. `main`에 push하면 `.github/workflows/deploy.yml`이 `npm ci` → 테스트 → 빌드 → 공식 Pages artifact 업로드 → 배포를 실행합니다. GitHub Repository의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정해야 합니다. 배포 주소는 `https://garim12.github.io/LottoRandom/`입니다.

## 구조

`src/components/common`은 탭, 테마, 알림, 보관함 UI를 담고, `src/components/lotto`와 `src/components/pension`은 각 생성기 UI를 담습니다. `src/utils`에는 Vue와 분리된 난수·생성·복사 로직이 있고, `src/composables`에는 테마·알림·저장소 로직이 있습니다. `src/types`는 공유 타입을 정의합니다.

## 책임 있는 이용

이 사이트는 무작위 번호 생성 도구입니다. 당첨 번호를 예측하거나 당첨을 보장하지 않으며, 모든 번호 조합의 당첨 가능성은 동일합니다. 미성년자는 복권을 구매할 수 없습니다.
