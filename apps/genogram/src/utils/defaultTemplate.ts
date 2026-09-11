import type { GenogramData } from '~/types/genogram'

/**
 * 初回表示・クリア後に入れる、本人+両親+祖父母(3世代)の下書き。
 * 名前や生年などは空のまま、AIやJSON編集で埋めていく前提の骨組み。
 */
export const defaultTemplateData: GenogramData = {
  people: [
    { id: 'pgf', name: '', gender: 'M', relation: '祖父' },
    { id: 'pgm', name: '', gender: 'F', relation: '祖母' },
    { id: 'mgf', name: '', gender: 'M', relation: '祖父' },
    { id: 'mgm', name: '', gender: 'F', relation: '祖母' },
    { id: 'father', name: '', gender: 'M', relation: '父' },
    { id: 'mother', name: '', gender: 'F', relation: '母' },
    { id: 'self', name: '本人', gender: 'U', isSelf: true },
  ],
  unions: [
    { partners: ['pgf', 'pgm'], status: 'married', children: ['father'] },
    { partners: ['mgf', 'mgm'], status: 'married', children: ['mother'] },
    { partners: ['father', 'mother'], status: 'married', children: ['self'] },
  ],
  relations: [],
}

export const defaultTemplateJson = JSON.stringify(defaultTemplateData, null, 2)
