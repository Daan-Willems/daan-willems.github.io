import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const localeString = z.record(z.string(), z.string())

export default defineContentConfig({
  collections: {
    sections: defineCollection({
      type: 'page',
      source: 'sections/**.md',
      schema: z.object({
        eyebrow: localeString.optional(),
        title: localeString.optional(),
        tagline: localeString.optional(),
        intro: localeString.optional(),
        ctaPrimary: localeString.optional(),
        ctaSecondary: localeString.optional(),
        ctaLabel: localeString.optional(),
        moreLabel: localeString.optional(),
        fromLabel: localeString.optional(),
        deliverablesLabel: localeString.optional(),
        socialTitle: localeString.optional(),
        socialIntro: localeString.optional(),
        stageTitle: localeString.optional(),
        stageIntro: localeString.optional(),
        phoneLabel: localeString.optional(),
        whatsappLabel: localeString.optional(),
        emailLabel: localeString.optional(),
        phoneHint: localeString.optional(),
        whatsappHint: localeString.optional(),
        emailHint: localeString.optional(),
        copyright: localeString.optional(),
        items: z.array(z.any()).optional(),
        links: z.array(z.any()).optional(),
      }).passthrough(),
    }),
  },
})
