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
        </div>
        <!-- 所在地はバッジ単体で中央に。建物名とその他の場所は下に米印の補足として置く -->
        <div class="hero-place">
          <span class="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            横浜市旭区若葉台3-5-1
          </span>
        </div>
        <div class="hero-notes">
          <p class="hero-note">※{{ site.places[0].name }}</p>
          <p class="hero-note">
            ※その他、不定期で東急田園都市線青葉台駅周辺のレンタルサロンでも施術を行っています。
          </p>
        </div>
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
      </div>
    </section>

    <!-- 特徴 -->
    <section id="feature">
      <div class="hr-wrap">
        <p class="section-label">Features</p>
        <h2 class="section-title">晴レルヤ鍼灸院の3つの特徴</h2>
        <div class="feature-grid">

          <div class="feature-card is-photo-card is-photo-right">
            <div class="feature-icon is-photo">
              <img src="/images/naizo-shinkyu.jpg" alt="内臓鍼灸でおなかの反応を確認している様子" width="558" height="581" loading="lazy" />
            </div>
            <div class="feature-text">
              <span class="feature-num">01</span>
              <h3 class="feature-title">内臓鍼灸</h3>
              <p class="feature-body">
                多くの内臓疾患はお腹に特有の反応が出ます。お腹の反応の場所によって、東洋医学でのどの五臓六腑を治療すべきかを確認します。鍼はごく細く、手、足、首、頭部などの皮膚表面を浅く刺します。一通り施術後、お腹の反応がどう変化しているか確認します。内臓鍼灸はこのお腹の反応がなくなったり、軽くなるのを目標にします。
              </p>
            </div>
          </div>

          <div class="feature-card is-photo-card">
            <div class="feature-icon is-photo">
              <img src="/images/action.jpg" alt="ソフトカイロ矯正の施術の様子" width="900" height="1601" loading="lazy" />
            </div>
            <div class="feature-text">
              <span class="feature-num">02</span>
              <h3 class="feature-title">ソフトカイロ矯正</h3>
              <p class="feature-body">
                関節の痛みや動きの制限など症状に合わせて、関節の動きと骨の位置を調整します。やさしい力でからだの土台となる骨格を整えていく方法なので、痛みが苦手な方にも受けていただけます。
              </p>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a4.6 4.6 0 0 0-6.5 0L12 7.9l-2.3-2.3a4.6 4.6 0 1 0-6.5 6.5l8.8 8.8 8.8-8.8a4.6 4.6 0 0 0 0-6.4z"/></svg>
            </div>
            <div class="feature-text">
              <span class="feature-num">03</span>
              <h3 class="feature-title">按腹（おなかのマッサージ）によるセルフケア</h3>
              <p class="feature-body">
                体の状態はお腹の皮膚表面にもあらわれます。お腹の状態に合わせて按腹（おなかのマッサージ）を行っていただくことで、より良い状態をキープすることができます。
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- メニュー・料金（施術の価値もこの中で紹介する） -->
    <section id="menu" class="hr-tint-pink">
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

          <div class="value-grid">
            <div v-for="value in values" :key="value.title" class="value-card">
              <span class="value-mark" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
              </span>
              <h4 class="value-title">{{ value.title }}</h4>
              <p class="value-body">{{ value.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 施術者紹介 -->
    <section id="profile" class="hr-tint-sky">
      <div class="hr-wrap">
        <p class="section-label">Profile</p>
        <h2 class="section-title">施術者のご紹介</h2>
        <div class="profile-card">
          <div class="profile-photo">
            <img src="/images/profile-usubuchi.jpg" alt="施術者 臼渕祥子" width="469" height="519" loading="lazy" />
          </div>
          <div class="profile-head">
            <p class="profile-name">
              臼渕 祥子
              <small>USUBUCHI SHOKO ／ うすぶち しょうこ</small>
            </p>
            <div class="profile-licenses">
              <span class="license-badge">鍼灸師（国家資格）</span>
              <span class="license-badge">助産師（国家資格）</span>
            </div>
          </div>
          <div class="profile-body">
            <p>
              私が鍼灸治療の存在を知ったのは、看護大学生の頃でした。原因不明の肝機能異常で、病院で投薬を受けてもなかなか改善しなかった父が、鍼灸院を紹介してもらい通うようになると、血液検査の結果がすっかり良くなり、治療の必要がなくなったのです。この出来事が、鍼灸治療との出会いのきっかけでした。
            </p>
            <p>
              就職後、病院で勤務する中で、投薬をしても結果が出ない患者さんを見るたびに、鍼灸治療の可能性が頭をよぎるようになりました。また、投薬に制限のある妊婦さんが痛みを訴えて入院する様子を見るたびに、投薬以外の方法で症状を改善する選択肢として、鍼灸治療を考えている自分がいました。
            </p>
            <p>
              そうして、病気や体の不調を西洋医学以外の視点から捉える東洋医学を学ぼうと、鍼灸師の資格を取得しました。鍼灸を実践するたびに体が変化していくのは、今でも本当に不思議で、面白いと感じています。同時に、鍼灸でどこまで対応できるのかを知ることで、西洋医学のすごさも実感しました。
            </p>
            <p>
              東洋医学と西洋医学、それぞれ異なる視点を組み合わせながら、痛みやつらい症状を改善するお手伝いができればと思っています。
            </p>
            <p>
              Instagram（<a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer">@{{ site.instagramId }}</a>）では、施術の様子や営業日の詳細を発信しています。
            </p>
          </div>
        </div>
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
        <p class="section-note">※ 曜日により施術場所が異なります</p>
        <div v-for="(place, i) in site.places" :key="place.name" class="access-place">
          <h3 class="access-place-title">
            <span class="access-place-num">{{ String(i + 1).padStart(2, '0') }}</span>
            {{ place.name }}
          </h3>
          <div class="access-grid">
            <dl class="access-table">
              <div class="access-row">
                <dt>所在地</dt>
                <dd>
                  {{ place.address }}
                  <small v-if="place.addressNote">{{ place.addressNote }}</small>
                </dd>
              </div>
              <div v-if="place.days" class="access-row">
                <dt>施術日</dt>
                <dd>
                  {{ place.days }}
                  <small v-if="place.daysNote">
                    {{ place.daysNote }}
                    <a
                      v-if="place.daysNoteLinkUrl"
                      :href="place.daysNoteLinkUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ place.daysNoteLinkLabel }}</a
                    >
                  </small>
                </dd>
              </div>
              <div v-if="place.hours" class="access-row">
                <dt>施術時間</dt>
                <dd>{{ place.hours }}</dd>
              </div>
              <div v-if="place.parking" class="access-row">
                <dt>駐車場</dt>
                <dd>
                  {{ place.parking }}
                  <small v-if="place.parkingNote">{{ place.parkingNote }}</small>
                </dd>
              </div>
            </dl>
            <div v-if="place.mapEmbedUrl" class="access-map">
              <iframe
                :src="place.mapEmbedUrl"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                :title="`${place.name}の地図`"
                allowfullscreen
              ></iframe>
            </div>
            <div v-else class="access-map-note">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ place.name }}<br />場所の詳細はLINEにてご案内しています。</span>
            </div>
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
  '胃腸の調子の症状（便秘・下痢・腹痛・胃痛・逆流性食道炎など）',
  '婦人科系の症状（生理不順・生理痛・PMS（月経前症候群）・冷え・むくみなど）',
  '整形外科系の症状（腰痛・膝痛・動作時の痛みなど）',
  '産後の腰痛、骨盤矯正、産前のからだづくり',
  'からだの緊張がとれない',
  '呼吸が浅い'
]

const values = [
  {
    title: '体の内側と外側、両方からアプローチ',
    body: 'はりによる体の内側へのアプローチに加え、骨格や関節など体の外側をソフトカイロ矯正で整えることで、効果が持続しやすくなります。'
  },
  {
    title: '自費施術だからこその自由な組み合わせ',
    body: '保険診療では制約を受ける施術も、自費だからこそ自由に組み合わせることができ、効果を出しやすくなります。'
  },
  {
    title: 'お腹を診る腹診を中心に',
    body: 'お腹の状態を見る腹診を中心に施術を行うため、ご自身の体にどんな変化があったのかが分かりやすくなっています。'
  },
  {
    title: '骨格へのアプローチで筋肉にも変化を',
    body: '筋肉の土台となる骨格にアプローチすることで、筋肉そのものにも変化を出すことができます。'
  },
  {
    title: '西洋医学と併用しながら通院可能',
    body: '病院への通院と並行しながら、西洋医学と合わせてお困りの症状にアプローチしていくことができます。'
  },
  {
    title: '患部に直接触れない遠隔アプローチも',
    body: 'はりには遠隔でも痛みを軽減できる方法があるため、炎症のある部位や患部に直接触れずにアプローチすることも可能です。'
  }
]

const flow = [
  {
    num: '01',
    title: 'ご予約',
    body: 'LINE公式アカウントから、お名前、ご希望の日時、お困りの症状を入力し、お送りください。月・木曜日以外は、施術場所確保の都合がありますので、予約フォームのお問い合わせ可能日より、まずはお問い合わせください。',
  },
  {
    num: '02',
    title: '問診・カウンセリング',
    body: '気になっている症状、これまでの経過、日々の生活の様子などをうかがいます。',
  },
  {
    num: '03',
    title: '施術',
    body: 'からだの状態を確認しながら、内臓鍼灸とソフトカイロ矯正を組み合わせて行います。使用する鍼はすべて使い捨ての清潔なものです。',
  },
  {
    num: '04',
    title: '施術後のご説明',
    body: 'その日のからだの状態と、ご自宅でできるセルフケアをお伝えします。からだの状態によって、次回のご予約についてご提案することがございます。',
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
