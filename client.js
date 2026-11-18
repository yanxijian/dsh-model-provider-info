/**
 * Client half: the composer's inline model label, plus its Settings → Models card.
 *
 * The `conversation.input.model.label` slot owns every place the composer names
 * the current model — the trigger caption, the root menu's current value, and
 * each selectable row. Without a contribution the selector renders the catalog
 * name alone, so the provider a model comes from is only visible as a group
 * heading inside the open menu. This contribution keeps the catalog name,
 * prefixes it with the provider's display name, and keeps the catalog badge the
 * built-in fallback would otherwise render.
 *
 * Emphasis is graded by surface: the two "current selection" surfaces (trigger,
 * menu value) mark a third-party route in the configured accent colour, because
 * "this answer came through someone else's endpoint" is worth seeing without
 * opening the menu. Rows of the expanded list stay a text annotation — every
 * group already has its provider as a heading, and a column of coloured chips
 * would turn a list into a wall of warnings.
 */
window.__ModuleLoader__.load({
  id: 'dsh-model-provider-info',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState, useSyncExternalStore } = React

    /** Locale namespace owned by this plugin. */
    const NS = 'modelProviderInfo'
    /** Browser-local preference record. */
    const STORAGE_KEY = 'dsh-model-provider-info/settings/v1'

    /**
     * First-party routes, matching the product's own first-party ordering
     * (`provider-order.ts` in ui-model-selection, `store.ts` in ui-settings-models).
     * Everything else — a relay, a self-hosted gateway, another vendor — is
     * third-party.
     */
    const FIRST_PARTY_PROVIDERS = new Set(['deepseek-account', 'deepseek-official'])

    /** Defaults when no preference has been stored yet. */
    const DEFAULT_SETTINGS = Object.freeze({
      /** Accent for third-party routes. */
      accent: '#F61A43',
      /** Colour the expanded list rows too, not just the current selection. */
      colorRows: false,
      /** Show the provider on DeepSeek's own routes (plain caption text). */
      showOfficialProvider: true,
    })

    /** Offered presets in the settings card; the value is a plain hex colour. */
    const ACCENT_PRESETS = ['#F61A43', '#F26B0F', '#2E6BE6', '#7C4DFF', '#1F9D55', '#6B7480']

    /* ------------------------------------------------------------------ *
     * Badge — a copy of the ui-primitives Tag geometry and tone palette.
     * The slot owner passes `model.badge`, and the built-in fallback draws it
     * with its own Tag; a contribution replaces that fallback entirely, so the
     * badge is reproduced here from the same tokens instead of being lost.
     * ------------------------------------------------------------------ */
    const TAG_BASE = {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '999px',
      padding: '1px 8px',
      fontSize: '11px',
      lineHeight: '17px',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }
    const TAG_TONES = {
      neutral: { background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)' },
      info: {
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent)',
        color: 'var(--dsw-alias-state-business-primary)',
      },
      success: {
        background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)',
        color: 'var(--dsw-alias-state-success-primary)',
      },
      warning: {
        background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)',
        color: 'var(--dsw-alias-state-warn-primary)',
      },
    }

    /* ------------------------------------------------------------------ *
     * Preference store — one record per browser, shared by the label and the
     * settings card through a module-level subscription.
     * ------------------------------------------------------------------ */
    const listeners = new Set()
    let settings = readSettings()

    /** Coerce a parsed record into the current shape. */
    function normalize(raw) {
      const accent = typeof raw?.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent)
        ? raw.accent.toLowerCase()
        : DEFAULT_SETTINGS.accent
      return {
        accent,
        colorRows: raw?.colorRows === true,
        showOfficialProvider: raw?.showOfficialProvider !== false,
      }
    }

    /** Read the stored record, falling back to defaults on any failure. */
    function readSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null) return { ...DEFAULT_SETTINGS }
        return normalize(JSON.parse(raw))
      } catch {
        return { ...DEFAULT_SETTINGS }
      }
    }

    /** Subscribe to preference changes; returns its own disposer. */
    function subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }

    /** Current preference record (a stable reference between writes). */
    function getSettings() {
      return settings
    }

    /** Merge one patch, persist it, and notify the label. */
    function patchSettings(patch) {
      settings = normalize({ ...settings, ...patch })
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch { /* a blocked storage area keeps the in-memory value */ }
      for (const listener of [...listeners]) listener()
    }

    /** Subscribe a component to the preference record. */
    function useSettings() {
      return useSyncExternalStore(subscribe, getSettings)
    }

    /* ------------------------------------------------------------------ *
     * Dictionaries
     * ------------------------------------------------------------------ */
    const zh = {
      'title': '模型名前显示供应商',
      'description': '在输入框的模型位里，把供应商名称显示在模型名称前面；DeepSeek 自己的两条路由用灰色文字，其他路由用下面的强调色标出。',
      'accent': '强调色',
      'accentHint': '仅用于非 DeepSeek 路由的供应商标签。',
      'presets': '预设',
      'custom': '自定义',
      'rows': '列表行也用强调色',
      'rowsHint': '关闭时，展开的模型列表里只有字重和灰度差别，不画色框。',
      'official': '官方路由也显示供应商',
      'officialHint': '关闭后，DeepSeek 账号与官方 API 只显示模型名。',
      'preview': '预览',
      'reset': '恢复默认',
      'sampleProvider': '第三方中转',
      'sampleModel': 'DeepSeek-V4.1-Flash',
      'badgeSample': '新',
    }
    const en = {
      'title': 'Provider before model name',
      'description': 'Shows the provider name before the model name in the composer model seat. DeepSeek\'s own routes stay in the caption tone; every other route uses the accent below.',
      'accent': 'Accent colour',
      'accentHint': 'Used only for the provider label of non-DeepSeek routes.',
      'presets': 'Presets',
      'custom': 'Custom',
      'rows': 'Accent the list rows too',
      'rowsHint': 'Off: the expanded model list differs only by tone and weight, with no coloured chip.',
      'official': 'Show the provider on DeepSeek routes',
      'officialHint': 'Off: the DeepSeek Account and official API routes show the model name alone.',
      'preview': 'Preview',
      'reset': 'Restore defaults',
      'sampleProvider': 'Relay',
      'sampleModel': 'DeepSeek-V4.1-Flash',
      'badgeSample': 'New',
    }

    /**
     * Build the label component for one plugin context.
     * @param ctx - browser plugin context (locale service for badge text).
     * @returns the slot component.
     */
    function createModelLabel(ctx) {
      /** Resolve one badge's literal-or-translations text through the locale service. */
      const resolveBadgeText = (text) => {
        try {
          return ctx.locale.resolveText(text)
        } catch {
          if (typeof text === 'string') return text
          return text?.zh ?? text?.en ?? ''
        }
      }

      /** The catalog badge, styled like the built-in Tag. */
      const renderBadge = (model, placement) => {
        const badge = model === undefined ? undefined : model.badge
        if (badge === undefined || badge.text === undefined) return null
        const text = resolveBadgeText(badge.text)
        if (text === '') return null
        return h('span', {
          style: {
            ...TAG_BASE,
            ...(TAG_TONES[badge.tone] ?? TAG_TONES.neutral),
            marginLeft: placement === 'trigger' ? undefined : '6px',
            marginRight: placement === 'trigger' ? '6px' : undefined,
          },
          'data-model-badge': badge.tone ?? 'neutral',
        }, text)
      }

      return function ModelLabel(props) {
        const { provider, model, placement } = props
        const current = useSettings()
        const modelName = model === undefined ? '' : model.name
        const badge = renderBadge(model, placement)

        if (provider === undefined || provider.name === undefined) {
          return h('span', null, badge, h('span', null, modelName))
        }

        const firstParty = FIRST_PARTY_PROVIDERS.has(provider.id)
        if (firstParty && !current.showOfficialProvider) {
          return h('span', null, placement === 'trigger' ? badge : null, h('span', null, modelName), placement === 'trigger' ? null : badge)
        }

        const colored = !firstParty && (placement !== 'option' || current.colorRows)
        const providerStyle = colored
          ? {
            color: current.accent,
            border: `1px solid ${current.accent}`,
            borderRadius: 'var(--dsw-radius-xs)',
            fontSize: '12px',
            lineHeight: '16px',
            fontWeight: 600,
            padding: '0 5px',
            marginRight: '4px',
            whiteSpace: 'nowrap',
          }
          : {
            color: firstParty ? 'var(--dsw-alias-label-caption)' : 'var(--dsw-alias-label-secondary)',
            fontWeight: firstParty ? 400 : 500,
          }
        const providerNode = h('span', { style: providerStyle }, provider.name)
        // The chip separates itself with its border and margin; every other
        // provider name needs the middot so it does not run into the model name.
        const separator = colored
          ? null
          : h('span', { style: { color: 'var(--dsw-alias-label-caption)', padding: '0 2px' }, 'aria-hidden': 'true' }, '·')

        return h('span', {
          'data-provider-label': '',
          'data-provider-kind': firstParty ? 'first-party' : 'third-party',
          'data-provider-coloured': colored ? '' : undefined,
        },
          placement === 'trigger' ? badge : null,
          providerNode,
          separator,
          h('span', null, modelName),
          placement === 'trigger' ? null : badge)
      }
    }

    /**
     * Build the Settings → Models footer card.
     * @param t - bound translator for this plugin's namespace.
     * @returns the slot component.
     */
    function createSettingsCard(t) {
      return function ProviderLabelSettings() {
        const current = useSettings()
        const [draft, setDraft] = useState(current.accent)
        useEffect(() => { setDraft(current.accent) }, [current.accent])

        /** Commit a typed hex colour once it is complete. */
        const commitDraft = (value) => {
          setDraft(value)
          if (/^#[0-9a-f]{6}$/i.test(value)) patchSettings({ accent: value.toLowerCase() })
        }

        const label = { fontSize: '13px', color: 'var(--dsw-alias-label-primary)', fontWeight: 500 }
        const hint = { margin: '2px 0 0', fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' }

        return h('section', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
            marginTop: '8px',
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 'var(--dsw-radius-md)',
            background: 'var(--dsw-alias-card-fill)',
          },
          'data-model-provider-info-settings': '',
        },
          h('header', null,
            h('h3', { style: { margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('title')),
            h('p', { style: hint }, t('description'))),

          h('div', null,
            h('span', { style: label }, t('accent')),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' } },
              ...ACCENT_PRESETS.map(preset => h('button', {
                key: preset,
                type: 'button',
                title: preset,
                'aria-label': preset,
                onClick: () => { patchSettings({ accent: preset }) },
                style: {
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: preset,
                  border: current.accent === preset
                    ? '2px solid var(--dsw-alias-label-primary)'
                    : '1px solid var(--dsw-alias-border-l2)',
                },
              })),
              h('input', {
                type: 'color',
                'aria-label': t('custom'),
                value: current.accent,
                onChange: event => { patchSettings({ accent: event.target.value.toLowerCase() }) },
                style: { width: '28px', height: '24px', padding: 0, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-xs)', background: 'transparent', cursor: 'pointer' },
              }),
              h('input', {
                type: 'text',
                'aria-label': t('custom'),
                value: draft,
                spellCheck: false,
                onChange: event => { commitDraft(event.target.value) },
                onBlur: () => { setDraft(current.accent) },
                style: {
                  width: '96px',
                  padding: '3px 8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 'var(--dsw-radius-sm)',
                  background: 'var(--dsw-alias-bg-layer-1)',
                  color: 'var(--dsw-alias-label-primary)',
                  font: 'inherit',
                  fontSize: '12px',
                },
              })),
            h('p', { style: hint }, t('accentHint'))),

          h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: current.colorRows,
              onChange: event => { patchSettings({ colorRows: event.target.checked }) },
              style: { marginTop: '2px' },
            }),
            h('span', null, h('span', { style: label }, t('rows')), h('p', { style: hint }, t('rowsHint')))),

          h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: current.showOfficialProvider,
              onChange: event => { patchSettings({ showOfficialProvider: event.target.checked }) },
              style: { marginTop: '2px' },
            }),
            h('span', null, h('span', { style: label }, t('official')), h('p', { style: hint }, t('officialHint')))),

          h('div', null,
            h('span', { style: label }, t('preview')),
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                padding: '4px 8px',
                borderRadius: 'var(--dsw-radius-sm)',
                background: 'var(--dsw-alias-bg-layer-1)',
                color: 'var(--dsw-alias-label-secondary)',
                fontSize: '13px',
              },
            },
              h('span', { style: { ...TAG_BASE, ...TAG_TONES.info } }, t('badgeSample')),
              h('span', {
                style: {
                  color: current.accent,
                  border: `1px solid ${current.accent}`,
                  borderRadius: 'var(--dsw-radius-xs)',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: 600,
                  padding: '0 5px',
                },
              }, t('sampleProvider')),
              h('span', null, t('sampleModel')))),

          h('div', null,
            h('button', {
              type: 'button',
              onClick: () => { patchSettings({ ...DEFAULT_SETTINGS }) },
              style: {
                padding: '4px 10px',
                border: '1px solid var(--dsw-alias-border-l2)',
                borderRadius: 'var(--dsw-radius-sm)',
                background: 'transparent',
                color: 'var(--dsw-alias-label-secondary)',
                font: 'inherit',
                fontSize: '12px',
                cursor: 'pointer',
              },
            }, t('reset'))))
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'model-provider-info: dictionaries')

        const ModelLabel = createModelLabel(ctx)
        const SettingsCard = createSettingsCard(t)

        ctx.slots.inject('conversation.input.model.label', () => ctx.slots.register(
          { name: 'conversation.input.model.label' },
          ModelLabel,
        ))
        ctx.slots.inject('settings.models.footer', () => ctx.slots.register(
          { name: 'settings.models.footer', id: 'model-provider-info', order: 20 },
          SettingsCard,
        ))
      },
    }
  },
})
