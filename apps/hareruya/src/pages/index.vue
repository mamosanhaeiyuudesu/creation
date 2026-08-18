<template>
  <div class="hr-page">

    <!-- ナビゲーション -->
    <nav class="hr-nav">
      <div class="hr-nav-inner">
        <a href="#top" class="hr-nav-logo">晴レルヤ鍼灸院</a>
        <div class="hr-nav-right">
          <ul class="hr-nav-links">
            <li v-for="link in navLinks" :key="link.href">
              <a :href="link.href">{{ link.label }}</a>
            </li>
          </ul>
          <LineButton class="hr-nav-cta" label="ご予約・お問い合わせ" fallback-href="#contact" brand />
          <InstagramButton class="hr-nav-insta" label="施術の様子" brand />
          <button
            type="button"
            class="hr-nav-toggle"
            :class="{ 'is-active': isMenuOpen }"
            :aria-expanded="isMenuOpen"
            aria-controls="hr-nav-mobile-menu"
            :aria-label="isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
            @click="isMenuOpen = !isMenuOpen"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <div id="hr-nav-mobile-menu" class="hr-nav-mobile" :class="{ 'is-open': isMenuOpen }">
        <ul class="hr-nav-mobile-links">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" @click="isMenuOpen = false">{{ link.label }}</a>
          </li>
        </ul>
        <LineButton
          class="hr-nav-mobile-cta"
          label="ご予約・お問い合わせ"
          fallback-href="#contact"
          brand
          @click="isMenuOpen = false"
        />
        <InstagramButton
          class="hr-nav-mobile-insta"
          label="施術の様子"
          brand
          @click="isMenuOpen = false"
        />
      </div>
    </nav>

    <!-- ヒーロー -->
    <section id="top" class="hr-hero">
      <div class="hero-inner">
        <img
          src="/images/main.png"
          alt="晴レルヤ鍼灸院 HARERUYA ACUPANCUTURE"
          class="hero-logo"
          width="1060"
          height="634"
        />
        <h1 class="hero-catch">
          お腹の反応から不調を紐解く<br />
          <em>内臓鍼灸</em><br />
          ×<br />
          骨格、関節の位置を調節する<br />
          <em>ソフトカイロ矯正</em>
        </h1>
        <p class="hero-sub">
          助産師でもある鍼灸師が、<br class="sp-only" />ゆらぎやすい女性のからだを整えます。
        </p>
        <div class="hero-badges">
          <span class="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {{ site.openDays }}に開催
          </span>
          <span class="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            {{ site.openHours }}
          </span>
          <span class="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            横浜市旭区若葉台3-5-1<br />（ショッピングタウンわかば『wakkaわっか』）
          </span>
        </div>
        <p class="hero-note">
          その他、不定期で東急田園都市線青葉台駅周辺のレンタルサロンでも施術を行っています。
        </p>
      </div>
      <svg class="hero-wave" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,24 C240,52 480,0 720,12 C960,24 1200,52 1440,28 L1440,48 L0,48 Z" fill="currentColor" />
      </svg>
    </section>

    <!-- こんなお悩み -->
    <section id="worry">
      <div class="hr-wrap">
        <p class="section-label">Your concerns</p>
        <h2 class="section-title">こんなお悩みはありませんか？</h2>
        <div class="worry-grid">
          <div v-for="worry in worries" :key="worry" class="worry-card">
            <span class="worry-dot" aria-hidden="true"></span>
            <span>{{ worry }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 当院について -->
    <section id="about" class="hr-tint-pink">
      <div class="hr-wrap">
        <p class="section-label">About</p>
        <h2 class="section-title">晴レルヤ鍼灸院について</h2>
        <div class="about-inner">
          <div class="about-body">
            <p>
              晴レルヤ鍼灸院は、横浜市旭区若葉台の商店街のレンタルスペースや、青葉台駅周辺のレンタルサロンなどで施術を行っています。
            </p>
            <p>
              リラクゼーションを目的としたお店ではなく、<strong>お困りの症状を改善すること</strong>を目的として、内臓鍼灸とソフトカイロ矯正を組み合わせた施術を行っています。
            </p>
            <p>
              院長は鍼灸師と助産師、両方の国家資格を持っています。月経・妊娠・出産・産後といった女性のからだのサイクルを現場で見てきた立場から、西洋医学と東洋医学の両方の視点から、おひとりずつの状態に合わせた施術とご相談をお受けしています。
            </p>
            <p>
              鍼がはじめての方も少なくありません。どんなことをするのか、どのくらいの刺激なのか、気になることは施術前に何でもお尋ねください。
            </p>
          </div>
          <figure class="about-photo">
            <img src="/images/action.jpg" alt="施術の様子" width="900" height="1601" loading="lazy" />
            <figcaption>施術の様子</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 特徴 -->
    <section id="feature">
      <div class="hr-wrap">
        <p class="section-label">Features</p>
        <h2 class="section-title">晴レルヤ鍼灸院の3つの特徴</h2>
        <div class="feature-grid">

          <div class="feature-card">
            <span class="feature-num">01</span>
            <div class="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>
            </div>
            <h3 class="feature-title">内臓鍼灸</h3>
            <p class="feature-body">
              表面に出ている症状だけを追うのではなく、内臓のはたらきに着目してアプローチする鍼灸です。おなかの状態をていねいに確認しながら、からだ全体のバランスを見ていきます。
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-num">02</span>
            <div class="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M9 6h6M8.5 10h7M8.5 14h7M9 18h6"/></svg>
            </div>
            <h3 class="feature-title">ソフトカイロ矯正</h3>
            <p class="feature-body">
              強い力でボキボキと鳴らす矯正ではありません。やさしい力でからだの土台となる骨格を整えていく方法なので、痛みが苦手な方にも受けていただけます。
            </p>
          </div>

          <div class="feature-card">
            <span class="feature-num">03</span>
            <div class="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a4.6 4.6 0 0 0-6.5 0L12 7.9l-2.3-2.3a4.6 4.6 0 1 0-6.5 6.5l8.8 8.8 8.8-8.8a4.6 4.6 0 0 0 0-6.4z"/></svg>
            </div>
            <h3 class="feature-title">助産師 × 鍼灸師</h3>
            <p class="feature-body">
              ふたつの国家資格を持つ施術者が担当します。女性のからだのサイクルを理解したうえでの施術と、日常のセルフケアのご提案。産前産後のご相談にも対応しています。
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- 施術者紹介 -->
    <section id="profile" class="hr-tint-sky">
      <div class="hr-wrap">
        <p class="section-label">Profile</p>
        <h2 class="section-title">施術者のご紹介</h2>
        <div class="profile-card is-solo">
          <div>
            <p class="profile-name">
              臼渕 祥子
              <small>USUBUCHI SHOKO ／ うすぶち しょうこ</small>
            </p>
            <div class="profile-licenses">
              <span class="license-badge">鍼灸師（国家資格）</span>
              <span class="license-badge">助産師（国家資格）</span>
            </div>
            <div class="profile-body">
              <p>
                助産師として多くの女性のからだと向き合うなかで、「病院に行くほどではないけれど、なんとなくつらい」という声をたくさん聞いてきました。検査の数値には表れにくい不調こそ、からだ全体を見ながらていねいに向き合う必要があると考えています。
              </p>
              <p>
                施術では、お話をうかがう時間を大切にしています。気になっていること、これまでの経過、日々の生活のこと。ご自身では関係ないと思っていることが、からだの状態を読み解くヒントになることも少なくありません。どうぞ遠慮なくお聞かせください。
              </p>
              <p>
                Instagram（<a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer">@{{ site.instagramId }}</a>）では、施術の様子や営業日の詳細を発信しています。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- メニュー・料金 -->
    <section id="menu">
      <div class="hr-wrap">
        <p class="section-label">Menu</p>
        <h2 class="section-title">メニュー・料金</h2>
        <div class="menu-list">
          <div v-for="menu in site.menus" :key="menu.name" class="menu-item">
            <div>
              <span class="menu-name">{{ menu.name }}</span>
              <span class="menu-duration">{{ menu.duration }}</span>
            </div>
            <div class="menu-price">
              <template v-if="isPricePending">
                <span class="price-ask">LINEにてご案内</span>
              </template>
              <template v-else>{{ menu.price }}</template>
            </div>
            <p class="menu-desc">{{ menu.desc }}</p>
          </div>
        </div>
        <p class="menu-note">
          <template v-if="isPricePending">
            ※ 料金はLINEにてご案内しています。お気軽にお問い合わせください。<br />
          </template>
          ※ 初回はカウンセリングのお時間を含みます。お時間に余裕をもってお越しください。<br />
          ※ 施術内容は、その日のからだの状態にあわせてご相談のうえ決めていきます。
        </p>
      </div>
    </section>

    <!-- 施術の流れ -->
    <section id="flow" class="hr-tint-pink">
      <div class="hr-wrap">
        <p class="section-label">Flow</p>
        <h2 class="section-title">施術の流れ</h2>
        <div class="flow-list">
          <div v-for="step in flow" :key="step.num" class="flow-step">
            <div class="flow-num">{{ step.num }}</div>
            <div>
              <h3 class="flow-title">{{ step.title }}</h3>
              <p class="flow-body">{{ step.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- アクセス -->
    <section id="access">
      <div class="hr-wrap">
        <p class="section-label">Access</p>
        <h2 class="section-title">アクセス</h2>
        <div class="access-grid">
          <dl class="access-table">
            <div class="access-row">
              <dt>所在地</dt>
              <dd>
                {{ site.address }}
                <small>{{ site.addressNote }}</small>
              </dd>
            </div>
            <div class="access-row">
              <dt>施術日</dt>
              <dd>{{ site.openDays }}</dd>
            </div>
            <div class="access-row">
              <dt>施術時間</dt>
              <dd>{{ site.openHours }}</dd>
            </div>
            <div class="access-row">
              <dt>ご予約</dt>
              <dd>
                LINE公式アカウントより受付
                <small>お電話でのご予約は承っておりません</small>
              </dd>
            </div>
          </dl>
          <div v-if="site.mapEmbedUrl" class="access-map">
            <iframe
              :src="site.mapEmbedUrl"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="晴レルヤ鍼灸院の地図"
              allowfullscreen
            ></iframe>
          </div>
          <div v-else class="access-map-note">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>ショッピングタウン若葉台内「Wakka（わっか）」<br />場所の詳細はLINEにてご案内しています。</span>
          </div>
        </div>
      </div>
    </section>

    <!-- お客様の声 -->
    <section v-if="site.showVoices" id="voice" class="hr-tint-sky">
      <div class="hr-wrap">
        <p class="section-label">Voice</p>
        <h2 class="section-title">お客様の声</h2>
        <div class="voice-grid">
          <div v-for="(voice, i) in site.voices" :key="i" class="voice-card">
            <p class="voice-body">{{ voice.body }}</p>
            <p class="voice-author">{{ voice.author }}</p>
          </div>
        </div>
        <p class="menu-note">
          ※ 掲載しているのは施術を受けられた方個人のご感想です。感じ方には個人差があり、効果を保証するものではありません。
        </p>
      </div>
    </section>

    <!-- ご予約 -->
    <section id="contact" class="hr-cta">
      <div class="hr-wrap">
        <div class="cta-inner">
          <h2 class="cta-title">まずは、お気軽にご相談ください。</h2>
          <p class="cta-desc">
            「これって鍼灸で相談していいのかな？」<br />
            そのくらいの段階で大丈夫です。<br />
            LINE公式アカウントより、お気軽にメッセージをお送りください。
          </p>
          <div class="cta-buttons">
            <LineButton class="btn-line" />
            <InstagramButton class="btn-insta" />
          </div>
          <p class="cta-note">
            施術日は{{ site.openDays }}です。<br />
            ご希望の日時をいくつかお知らせいただけると、やりとりがスムーズです。<br />
            Instagram（@{{ site.instagramId }}）では、施術の様子や営業日の詳細を発信しています。
          </p>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="hr-footer">
      <p class="hr-footer-logo">晴レルヤ鍼灸院</p>
      <p class="hr-footer-en">HARERUYA ACUPANCUTURE</p>
      <p class="hr-footer-meta">
        {{ site.address }}<br />
        {{ site.openDays }}／{{ site.openHours }}
      </p>
      <p class="hr-footer-copy">&copy; {{ new Date().getFullYear() }} HARERUYA ACUPANCUTURE</p>
    </footer>

    <!-- モバイル固定予約バー -->
    <div class="hr-mobile-bar">
      <LineButton class="hr-mobile-bar-line" label="ご予約・お問い合わせ" fallback-href="#contact" brand />
      <InstagramButton class="hr-mobile-bar-insta" label="施術の様子" brand />
    </div>

  </div>
</template>

<script setup lang="ts">
import { site, isPricePending } from '~/config/site'

definePageMeta({ layout: 'hareruya' })

const isMenuOpen = ref(false)

const navLinks = [
  { href: '#about', label: '当院について' },
  { href: '#feature', label: '3つの特徴' },
  { href: '#profile', label: '施術者について' },
  { href: '#flow', label: '施術の流れ' },
  { href: '#access', label: 'アクセス' },
]

const worries = [
  '病院で「異常なし」と言われたけれど、痛みや辛い症状がある',
  '自律神経の乱れが気になる（不安感・動悸・めまい・不眠など）',
  '胃腸の調子が安定しない（便秘・下痢・腹痛・胃痛・逆流性食道炎など）',
  '生理不順・冷え・むくみなど、婦人科系の不調が気になる',
  '産後の腰痛、骨盤矯正、産前のからだづくり',
  'からだの緊張がとれない',
  '呼吸が浅い'
]

const flow = [
  {
    num: '01',
    title: 'ご予約',
    body: 'LINE公式アカウントから、ご希望の日時をお送りください。施術日は月曜日・木曜日です。',
  },
  {
    num: '02',
    title: '問診・カウンセリング',
    body: '気になっている症状、これまでの経過、日々の生活の様子などをうかがいます。初回はこのお時間をたっぷりとります。',
  },
  {
    num: '03',
    title: '施術',
    body: 'からだの状態を確認しながら、内臓鍼灸とソフトカイロ矯正を組み合わせて行います。使用する鍼はすべて使い捨ての清潔なものです。',
  },
  {
    num: '04',
    title: '施術後のご説明',
    body: 'その日のからだの状態と、ご自宅でできるセルフケアをお伝えします。次回のご予約もこの場で承ります。',
  },
]

useHead({
  title: '晴レルヤ鍼灸院 | 横浜市旭区若葉台の内臓鍼灸・ソフトカイロ矯正',
  htmlAttrs: { lang: 'ja' },
  meta: [
    {
      name: 'description',
      content:
        '横浜市旭区若葉台Wakka内の鍼灸院。助産師でもある鍼灸師が、内臓鍼灸とソフトカイロ矯正でからだ全体の調整を行います。毎週月曜日・木曜日、予約制。',
    },
    { property: 'og:title', content: '晴レルヤ鍼灸院 | 内臓鍼灸とソフトカイロ矯正' },
    {
      property: 'og:description',
      content:
        '助産師でもある鍼灸師が、女性のからだの声に寄り添います。横浜市旭区若葉台Wakka内、毎週月曜日・木曜日。',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/images/main.png' },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>`,
    },
  ],
})
</script>

<style>
@import '~/assets/css/hareruya.css';
</style>
