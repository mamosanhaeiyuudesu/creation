"""
miyako「全体像を見る」の円の大きさに使う、単語ごとの出現回数（src/public/data/word_counts.json）を作る。

pairs.json の単語は UniDic の語彙素の表記（城辺→グスクベ、もずく→水雲）なので、本文の文字列検索では数えられない。
本文を fugashi + unidic-lite で語に分け、pairs.json にある語を語の切れ目から長い順に照合して数える
（長い複合語の中の語は重ねて数えない）。AI は使わない。

実行（apps/ai-tools で。本文は1会期1ファイルの .txt を置いたフォルダ。対象は miyako-features.json の162会期＝
pairs.json と同じ期間。本文は Vector Store の GET /vector_stores/{id}/files/{file_id}/content で取り出せる。
file_id は src/server/data/miyako-file-ids.json）:
  pip install fugashi unidic-lite
  python3 scripts/miyako-word-counts.py <本文のフォルダ>
"""
import collections, glob, json, sys, unicodedata
from fugashi import Tagger
texts=sys.argv[1]
p=json.load(open('src/public/data/pairs.json'))
words={w for x in p for w in (x['source'],x['target'])}
# 'パソコン-personal computer' のような表記は '-' の前で照合する
keymap={}
for w in sorted(words,key=lambda w:('-' in w,w)):
    keymap.setdefault(w.split('-')[0] or w,[]).append(w)
vocab=set(keymap)
maxlen=max(map(len,vocab))
t=Tagger(); c=collections.Counter()
for f in glob.glob(texts+'/*.txt'):
    for sent in unicodedata.normalize('NFKC',open(f).read()).split('。'):
        toks=[((w.feature.lemma or w.surface).split('-')[0] or w.surface) for w in t(sent)]
        i=0;n=len(toks)
        while i<n:
            s='';best=None
            for j in range(i,n):
                s+=toks[j]
                if len(s)>maxlen+25: break
                if s in vocab: best=(j,s)
            if best: c[best[1]]+=1;i=best[0]+1
            else: i+=1
c={w:c[k] for k,ws in keymap.items() for w in ws}
json.dump(dict(sorted(c.items(),key=lambda kv:(-kv[1],kv[0]))),open('src/public/data/word_counts.json','w'),ensure_ascii=False,separators=(',',':'))
print('vocab',len(words),'zero',sum(not c.get(w) for w in words),'maxlen',maxlen)
