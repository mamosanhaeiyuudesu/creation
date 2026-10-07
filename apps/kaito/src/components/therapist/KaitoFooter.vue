<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <nav class="footer-nav" aria-label="ページ内リンク">
        <a href="#for-you">こんな方へ</a>
        <a href="#style">セラピーのスタイル</a>
        <a href="#services">セラピーの内容</a>
        <a href="#testimonials">お客様の声</a>
        <a href="#faq">よくある質問</a>
        <a href="#about">月ノ瀬 直について</a>
        <button class="footer-law-btn" @click="isOpen = true">特定商取引法に基づく表記</button>
      </nav>
      <div>© 2026 月ノ瀬 直</div>
    </div>

    <Teleport to="body">
      <div v-if="isOpen" class="law-overlay" @click.self="isOpen = false">
        <div class="law-modal" role="dialog" aria-modal="true" aria-label="特定商取引法に基づく表記">
          <button class="law-close" @click="isOpen = false" aria-label="閉じる">×</button>
          <h2 class="law-title">特定商取引法に基づく表記</h2>
          <dl class="law-list">
            <div class="law-row">
              <dt>役務提供事業者</dt>
              <dd>月ノ瀬 直</dd>
            </div>
            <div class="law-row">
              <dt>代表者または運営責任者</dt>
              <dd>月ノ瀬 直</dd>
            </div>
            <div class="law-row">
              <dt>所在地</dt>
              <dd>※上記住所については、お客様からのご請求があった場合、遅滞なく開示いたします。開示をご希望の場合は、下記お問い合わせフォームまたはメールアドレスまでご連絡ください。</dd>
            </div>
            <div class="law-row">
              <dt>電話番号</dt>
              <dd>※上記の「所在地」の注記と同様に、請求時の開示とする場合はお客様からのご請求があった場合、遅滞なく開示いたします。</dd>
            </div>
            <div class="law-row">
              <dt>メールアドレス</dt>
              <dd>nao.6291034@gmail.com</dd>
            </div>
            <div class="law-row">
              <dt>ホームページURL</dt>
              <dd>https://kaito-tsukinose.jp</dd>
            </div>
            <div class="law-row">
              <dt>提供サービス・商品の価格</dt>
              <dd>
                各セラピー・講座のご紹介ページに記載の金額（税込）をご参照ください。<br>
                ・おしゃべりカウンセリング / ブロック解放セラピー / レムリアンヒーリング / クリスタルヒーリング：単発 5,000円〜30,000円<br>
                ・継続コース 49,800円〜225,000円<br>
                ・アクティベーション講座：各全6回 300,000円
              </dd>
            </div>
            <div class="law-row">
              <dt>商品代金以外に必要な料金</dt>
              <dd>
                ・銀行振込の場合：振込手数料<br>
                ・オンラインセラピー時の通信料（Zoom等のインターネット接続費用はお客様のご負担となります）
              </dd>
            </div>
            <div class="law-row">
              <dt>お支払い方法</dt>
              <dd>
                ・銀行振込<br>
                ・クレジットカード決済（各種キャッシュレス決済）
              </dd>
            </div>
            <div class="law-row">
              <dt>代金の支払時期・支払方法</dt>
              <dd>
                ・単発セラピー：ご予約確定後、セラピー開催日3日前までにお支払いください。<br>
                ・継続講座：初回受講日の前日まで、または事前の取り決めに基づく分割支払いスケジュールに沿ってお支払いください。
              </dd>
            </div>
            <div class="law-row">
              <dt>役務の提供時期（引き渡し時期）</dt>
              <dd>ご予約いただいた日時、または講座のスケジュールに基づき提供いたします。</dd>
            </div>
          </dl>
        </div>
      </div>
    </Teleport>
  </footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const isOpen = ref(false)
</script>
