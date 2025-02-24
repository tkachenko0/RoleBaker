// https://github.com/nuxt-themes/docus/blob/main/nuxt.schema.ts
export default defineAppConfig({
  docus: {
    title: "RoleBaker",
    description: "RoleBaker documentation documentation.",
    image:
      "https://user-images.githubusercontent.com/904724/185365452-87b7ca7b-6030-4813-a2db-5e65c785bf88.png",
    socials: {
      //twitter: 'nuxt_js',
      github: "https://github.com/tkachenko0/RoleBaker",
      //nuxt: {
      //  label: 'Nuxt',
      //  icon: 'simple-icons:nuxtdotjs',
      //  href: 'https://nuxt.com'
      // }
    },
    github: {
      dir: "./content",
      branch: "main",
      repo: "role-baker-docs",
      owner: "tkachenko0",
      edit: true,
    },
    aside: {
      level: 0,
      collapsed: false,
      exclude: [],
    },
    main: {
      padded: true,
      fluid: true,
    },
    header: {
      logo: false,
      title: "Role Baker",
      showLinkIcon: true,
      exclude: [],
      fluid: true,
    },
  },
});
