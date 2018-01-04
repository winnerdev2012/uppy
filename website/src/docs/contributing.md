---
title: "Contributing"
type: docs
order: 4
---

## Uppy Development

First clone and install the project:

```bash
git clone git@github.com:transloadit/uppy.git
cd uppy
npm install
```

Our website's examples section is also our playground, read "Website Development"'s "Local Previews" section to get up and running.

## Website Development

We keep the [uppy.io](http://uppy.io) website in `./website` for so it's easy to keep docs & code in sync as we're still iterating at high velocity. For those reading this screaming murder, [HashiCorp does this](https://github.com/hashicorp/terraform/tree/master/website) for all their projects, and it's working well for them on a scale vastly more impressive than Uppy's.

The site is built with [Hexo](http://hexo.io/), and Travis automatically deploys this onto GitHub Pages (it overwrites the `gh-pages` branch with Hexo's build at every change to `master`). The content is written in Markdown and located in `./website/src`. Feel free to fork & hack!  

Even though bundled in this repo, the website is regarded as a separate project. So it has its own `package.json` and we aim keep the surface where the two projects interface as small as possible. `./website/update.js` is called during website builds to inject the Uppy knowledge into the site.

### Local Previews

It's recommended to exclude `./website/public/` from your editor if you want efficient searches.

To install the required node modules, type:
```bash
npm install && cd website && npm install && cd ..
```

For local previews on http://127.0.0.1:4000 type:

```bash
npm start
```

This will watch the website, as well as Uppy, as the examples, and rebuild everything and refresh your browser as files change.

Then, to work on e.g. the Multipart example, you'd edit the following files:

```bash
atom src/core/Core.js \
  src/plugins/Multipart.js \
  src/plugins/Formtag.js \
  src/plugins/Plugin.js \
  website/src/examples/multipart/app.es6
```

And open <http://0.0.0.0:4000/examples/multipart/index.html> in your webbrowser.

## Tests

Unit tests can be run with:

`npm run test:unit`

For acceptance (or end to end) tests, we use [Webdriverio](http://webdriver.io). For it to run locally, you need to install selenium standalone server, just follow [the guide](http://webdriver.io/guide.html) to do so.

After you’ve installed and launched the selenium standalone server, run:

`npm run test:acceptance:local`

## CSS Guidelines

The CSS standards followed in this project closely resemble those from [Medium's CSS Guidelines](https://gist.github.com/fat/a47b882eb5f84293c4ed). If it's not mentioned here, follow their guidelines.

### Naming Conventions

This project uses naming conventions adopted from the SUIT CSS framework.
[Read about them here](https://github.com/suitcss/suit/blob/master/doc/naming-conventions.md).

To quickly summarize:

#### Utilities

Syntax: u-[sm-|md-|lg-]<utilityName>

```css
.u-utilityName
.u-floatLeft
.u-lg-col6
```

#### Components

Syntax: [<namespace>-]<ComponentName>[-descendentName][--modifierName]

```css
.twt-Button /* Namespaced component */
.MyComponent /* Components pascal cased */
.Button--default /* Modified button style */
.Button--large

.Tweet
.Tweet-header /* Descendents */
.Tweet-bodyText

.Accordion.is-collapsed /* State of component */
.Accordion.is-expanded
```

### SASS

This project uses SASS, with some limitations on nesting.  One-level deep nesting is allowed, but nesting may not extend a selector by using the `&` operator.  For example:

```sass
/* BAD */
.Button {
  &--disabled {
    ...
  }
}

/* GOOD */
.Button {
  ...
}

.Button--disabled {
  ...
}
```

### Mobile-first Responsive Approach

Style to the mobile breakpoint with your selectors, then use `min-width` media queries to add any styles to the tablet or desktop breakpoints.

### Selector, Rule Ordering

- All selectors are sorted alphabetically and by type.
- HTML elements go above classes and IDs in a file.
- Rules are sorted alphabetically.

```sass
/* BAD */
.wrapper {
  width: 940px;
  margin: auto;
}

h1 {
  color: red;
}

.article {
  width: 100%;
  padding: 32px;
}

/* GOOD */
h1 {
  color: red;
}

.article {
  padding: 32px;
  width: 100%;
}

.wrapper {
  margin: auto;
  width: 940px;
}
```
