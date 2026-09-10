import type { GenogramData } from '~/types/genogram'

/**
 * 初回表示・クリア後に入れる、本人+両親+祖父母(3世代)の下書き。
 * 名前や生年などは空のまま、AIやJSON編集で埋めていく前提の骨組み。
 */
export const defaultTemplateData: GenogramData = {
  people: [
    { id: 'pgf', name: '祖父(父方)', gender: 'M', relation: '祖父(父方)' },
    { id: 'pgm', name: '祖母(父方)', gender: 'F', relation: '祖母(父方)' },
    { id: 'mgf', name: '祖父(母方)', gender: 'M', relation: '祖父(母方)' },
    { id: 'mgm', name: '祖母(母方)', gender: 'F', relation: '祖母(母方)' },
    { id: 'father', name: '父', gender: 'M', relation: '父' },
    { id: 'mother', name: '母', gender: 'F', relation: '母' },
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
