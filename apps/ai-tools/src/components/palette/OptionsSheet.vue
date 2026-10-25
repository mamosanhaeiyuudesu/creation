<template>
  <div class="pl-sheet-backdrop" @click.self="$emit('close')">
    <div class="pl-sheet-panel" role="dialog" aria-modal="true" aria-label="オプション">
      <div class="pl-sheet-handle" aria-hidden="true" />
      <div class="pl-sheet-head">
        <h2 class="pl-h2">オプション</h2>
        <button class="pl-sheet-close" aria-label="閉じる" @click="$emit('close')">✕</button>
      </div>
      <p class="pl-note mb-4">変更は自動で保存され、次回以降も同じ設定で使われます（シードだけは保存しません）。</p>

      <div class="grid sm:grid-cols-2 gap-x-6 gap-y-5">
        <ParamField label="画像サイズ" for-id="op-size" :help="mode === 'i2i' ? '生成する絵の縦横の大きさ。「元画像と同じ」は入力画像の大きさのまま描き直します。大きいほど細部が出ますが、時間と料金が増えます。' : '生成する絵の縦横の大きさ。square は正方形、portrait は縦長、landscape は横長です。大きいほど細部が出ますが、時間と料金が増えます。'">
          <select id="op-size" v-model="params.imageSize" class="pl-input">
            <option v-if="mode === 'i2i'" value="auto">元画像と同じ</option>
            <option value="square_hd">正方形 HD（1024×1024）</option>
            <option value="square">正方形（512×512）</option>
            <option value="portrait_4_3">縦長 3:4</option>
            <option value="portrait_16_9">縦長 9:16</option>
            <option value="landscape_4_3">横長 4:3</option>
            <option value="landscape_16_9">横長 16:9</option>
            <option value="custom">幅×高さを指定</option>
          </select>
          <div v-if="params.imageSize === 'custom'" class="mt-2 flex items-center gap-2">
            <input v-model.number="params.width" type="number" min="256" max="2048" step="64" class="pl-input" aria-label="幅" />
            <span class="text-[var(--pl-ink-soft)]">×</span>
            <input v-model.number="params.height" type="number" min="256" max="2048" step="64" class="pl-input" aria-label="高さ" />
          </div>
        </ParamField>

        <ParamField label="枚数（1〜4）" for-id="op-num" help="一度に作る枚数です。料金は枚数に比例して増えます。構図や雰囲気を探りたいときは複数枚、仕上げるときは 1 枚が向いています。">
          <input id="op-num" v-model.number="params.numImages" type="number" min="1" max="4" step="1" class="pl-input" />
        </ParamField>

        <ParamField label="ステップ数（1〜50）" for-id="op-steps" help="絵をどれだけ丁寧に描き込むか（ノイズを取り除く回数）です。多いほど細部が整いますが、遅くなり料金も増えます。28 前後で十分で、増やしても変化は小さくなります。">
          <input id="op-steps" v-model.number="params.steps" type="number" min="1" max="50" step="1" class="pl-input" />
        </ParamField>

        <ParamField label="ガイダンス（CFG・0〜35）" for-id="op-guid" help="プロンプトにどれだけ忠実に従うかです。低いと自由で自然な絵に、高いと指示には忠実ですが不自然で派手な絵になりやすくなります。FLUX では 3〜4 が目安です。">
          <input id="op-guid" v-model.number="params.guidance" type="number" min="0" max="35" step="0.5" class="pl-input" />
        </ParamField>

        <ParamField v-if="mode === 'i2i'" label="変化の強さ（0.01〜1）" for-id="op-str" help="元画像をどれだけ作り変えるかです。小さいほど元画像に近く、1 に近いほど元画像から離れて自由に描き直します。0.5〜0.8 あたりから試すと調整しやすいです。">
          <div class="flex items-center gap-3">
            <input v-model.number="params.strength" type="range" min="0.01" max="1" step="0.01" class="flex-1 accent-[var(--pl-teal)]" aria-label="変化の強さ" />
            <input id="op-str" v-model.number="params.strength" type="number" min="0.01" max="1" step="0.01" class="pl-input !w-[80px] text-center" />
          </div>
        </ParamField>

        <ParamField label="シード（保存されません）" for-id="op-seed" help="乱数の種です。空欄なら毎回ランダム。同じシード・同じ設定なら同じ絵になるので、気に入った構図のまま、プロンプトや LoRA の強さだけを少し変えて比べたいときに入れます。">
          <input id="op-seed" :value="seedText" inputmode="numeric" class="pl-input" placeholder="空欄 = ランダム" @input="$emit('update:seedText', ($event.target as HTMLInputElement).value)" />
        </ParamField>

        <ParamField label="出力形式" for-id="op-fmt" help="jpeg は軽く、png は劣化がない代わりに大きなファイルになります。普段は jpeg で十分です。">
          <select id="op-fmt" v-model="params.format" class="pl-input">
            <option value="jpeg">jpeg</option>
            <option value="png">png</option>
          </select>
        </ParamField>

        <ParamField label="高速化" for-id="op-acc" help="regular にすると少し速く生成できます。画質がわずかに変わることがあります。普段は none（しない）のままで構いません。">
          <select id="op-acc" v-model="params.acceleration" class="pl-input">
            <option value="none">none（しない）</option>
            <option value="regular">regular</option>
          </select>
        </ParamField>

        <ParamField label="セーフティチェッカー" help="不適切な画像を検出して、黒塗りにする機能です。オフにすると、誤検知で黒い画像になるのを避けられます。">
          <label class="flex items-center gap-2 text-[14px]">
            <input v-model="params.safety" type="checkbox" class="accent-[var(--pl-teal)] w-4 h-4" />
            有効にする
          </label>
        </ParamField>
      </div>

      <div class="flex items-center justify-between gap-2 mt-6">
        <button class="pl-btn-text" @click="$emit('reset')">初期値に戻す</button>
        <button class="pl-btn" @click="$emit('close')">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ParamField from '~/components/palette/ParamField.vue'
import type { PaletteMode, PaletteParams } from '~/types/palette'

// params は親が持つ reactive なオブジェクトで、ここで直接書き換える（親が保存を見ている）
defineProps<{ params: PaletteParams; mode: PaletteMode; seedText: string }>()
defineEmits<{ (e: 'close'): void; (e: 'reset'): void; (e: 'update:seedText', v: string): void }>()
</script>
