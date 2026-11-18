/**
 * Client half: the composer's inline model label, its Settings → Models default
 * card, and a per-provider colour control on every provider card.
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
 * menu value) mark a third-party route in its accent colour, because "this
 * answer came through someone else's endpoint" is worth seeing without opening
 * the menu. Rows of the expanded list stay a text annotation — every group
 * already has its provider as a heading, and a column of coloured chips would
 * turn a list into a wall of warnings.
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
      /** Accent for third-party routes without their own colour. */
      accent: '#F61A43',
      /** Per-provider colour overrides, keyed by the catalog's provider id. */
      colors: Object.freeze({}),
      /** Colour the expanded list rows too, not just the current selection. */
      colorRows: false,
      /** Show the provider on DeepSeek's own routes (plain caption text). */
      showOfficialProvider: true,
    })

    /** Offered presets; the value is a plain hex colour. */
    const ACCENT_PRESETS = ['#F61A43', '#F26B0F', '#2E6BE6', '#7C4DFF', '#1F9D55', '#6B7480']

    /** `#rrggbb`, the only accepted shape for a stored colour. */
    const HEX = /^#[0-9a-f]{6}$/i

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
     * Preference store — one record per browser, shared by the label and both
     * settings surfaces through a module-level subscription.
     * ------------------------------------------------------------------ */
    const listeners = new Set()
    let settings = readSettings()

    /** Coerce a parsed record into the current shape. */
    function normalize(raw) {
      const accent = typeof raw?.accent === 'string' && HEX.test(raw.accent)
        ? raw.accent.toLowerCase()
        : DEFAULT_SETTINGS.accent
      const colors = {}
      if (raw?.colors !== null && typeof raw?.colors === 'object') {
        for (const [provider, value] of Object.entries(raw.colors)) {
          if (typeof value === 'string' && HEX.test(value)) colors[provider] = value.toLowerCase()
        }
      }
      return {
        accent,
        colors,
        colorRows: raw?.colorRows === true,
        showOfficialProvider: raw?.showOfficialProvider !== false,
      }
    }

    /** Read the stored record, falling back to defaults on any failure. */
    function readSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null) return normalize(DEFAULT_SETTINGS)
        return normalize(JSON.parse(raw))
      } catch {
        return normalize(DEFAULT_SETTINGS)
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

    /** Merge one patch, persist it, and notify every surface. */
    function patchSettings(patch) {
      settings = normalize({ ...settings, ...patch })
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch { /* a blocked storage area keeps the in-memory value */ }
      for (const listener of [...listeners]) listener()
    }

    /** Set one provider's own colour. */
    function setProviderColor(providerId, hex) {
      if (typeof providerId !== 'string' || providerId === '' || !HEX.test(hex)) return
      patchSettings({ colors: { ...settings.colors, [providerId]: hex.toLowerCase() } })
    }

    /** Drop one provider's override so it falls back to the default accent. */
    function clearProviderColor(providerId) {
      const next = { ...settings.colors }
      delete next[providerId]
      patchSettings({ colors: next })
    }

    /** Subscribe a component to the preference record. */
    function useSettings() {
      return useSyncExternalStore(subscribe, getSettings)
    }

    /** The colour that applies to one provider: its override, else the accent. */
    function colorFor(current, providerId) {
      return current.colors[providerId] ?? current.accent
    }

    /* ------------------------------------------------------------------ *
     * Dictionaries
     * ------------------------------------------------------------------ */
    const zh = {
      'title': '模型名前显示供应商',
      'description': '在输入框的模型位里，把供应商名称显示在模型名称前面；DeepSeek 自己的两条路由用灰色文字，其他路由用下面这个默认强调色。',
      'accent': '默认强调色',
      'accentHint': '没有单独设置颜色的供应商用它。想给某个供应商单独配色，去它自己的卡片里改。',
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
      'cardLabel': '供应商标签颜色',
      'cardHint': '只影响这个供应商的标签。',
      'cardDefault': '跟随默认',
      'cardClear': '清除',
      'cardOverridden': '已单独设置',
      'cardUnable': '这个设置页不可用，颜色保存在浏览器里。',
    }
    const en = {
      'title': 'Provider before model name',
      'description': 'Shows the provider name before the model name in the composer model seat. DeepSeek\'s own routes stay in the caption tone; every other route uses the default accent below.',
      'accent': 'Default accent',
      'accentHint': 'Used by providers without a colour of their own. Set a provider-specific colour on its own card.',
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
      'cardLabel': 'Provider label colour',
      'cardHint': 'Only this provider\'s label is affected.',
      'cardDefault': 'Follow the default',
      'cardClear': 'Clear',
      'cardOverridden': 'Set separately',
      'cardUnable': 'This settings surface is unavailable; colours live in the browser.',
    }

    /* ------------------------------------------------------------------ *
     * Shared bits
     * ------------------------------------------------------------------ */
    const labelStyle = { fontSize: '13px', color: 'var(--dsw-alias-label-primary)', fontWeight: 500 }
    const hintStyle = { margin: '2px 0 0', fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' }

    /** One round colour button. */
    function swatch({ key, color, size, active, onClick }) {
      return h('button', {
        key,
        type: 'button',
        title: color,
        'aria-label': color,
        'aria-pressed': active,
        onClick,
        style: {
          width: size,
          height: size,
          padding: 0,
          borderRadius: '50%',
          cursor: 'pointer',
          background: color,
          border: active
            ? '2px solid var(--dsw-alias-label-primary)'
            : '1px solid var(--dsw-alias-border-l2)',
        },
      })
    }

    /** A hex text field plus the native colour picker beside it. */
    function colorInputs({ value, ariaLabel, onCommit }) {
      return [
        h('input', {
          key: 'picker',
          type: 'color',
          'aria-label': ariaLabel,
          value,
          onChange: event => { onCommit(event.target.value.toLowerCase()) },
          style: {
            width: '28px',
            height: '24px',
            padding: 0,
            border: '1px solid var(--dsw-alias-border-l2)',
            borderRadius: 'var(--dsw-radius-xs)',
            background: 'transparent',
            cursor: 'pointer',
          },
        }),
        h('input', {
          key: 'hex',
          type: 'text',
          'aria-label': ariaLabel,
          defaultValue: value,
          spellCheck: false,
          onChange: event => {
            const next = event.target.value.trim()
            if (HEX.test(next)) onCommit(next.toLowerCase())
          },
          style: {
            width: '92px',
            padding: '3px 8px',
            border: '1px solid var(--dsw-alias-border-l2)',
            borderRadius: 'var(--dsw-radius-sm)',
            background: 'var(--dsw-alias-bg-layer-1)',
            color: 'var(--dsw-alias-label-primary)',
            font: 'inherit',
            fontSize: '12px',
          },
        }),
      ]
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
          return h('span', null,
            placement === 'trigger' ? badge : null,
            h('span', null, modelName),
            placement === 'trigger' ? null : badge)
        }

        // An explicit per-provider colour always wins, including on DeepSeek's
        // own routes: choosing a colour for one is a request to see it.
        const override = current.colors[provider.id]
        const colored = override !== undefined || (!firstParty && (placement !== 'option' || current.colorRows))
        const accent = override ?? current.accent
        const providerStyle = colored
          ? {
            color: accent,
            border: `1px solid ${accent}`,
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
          h('span', { style: providerStyle }, provider.name),
          separator,
          h('span', null, modelName),
          placement === 'trigger' ? null : badge)
      }
    }

    /**
     * Build the default card at the bottom of Settings → Models.
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
          if (HEX.test(value)) patchSettings({ accent: value.toLowerCase() })
        }

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
            h('p', { style: hintStyle }, t('description'))),

          h('div', null,
            h('span', { style: labelStyle }, t('accent')),
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
              ...colorInputs({ value: current.accent, ariaLabel: t('custom'), onCommit: commitDraft })),
            h('p', { style: hintStyle }, t('accentHint'))),

          h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: current.colorRows,
              onChange: event => { patchSettings({ colorRows: event.target.checked }) },
              style: { marginTop: '2px' },
            }),
            h('span', null, h('span', { style: labelStyle }, t('rows')), h('p', { style: hintStyle }, t('rowsHint')))),

          h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: current.showOfficialProvider,
              onChange: event => { patchSettings({ showOfficialProvider: event.target.checked }) },
              style: { marginTop: '2px' },
            }),
            h('span', null, h('span', { style: labelStyle }, t('official')), h('p', { style: hintStyle }, t('officialHint')))),

          h('div', null,
            h('span', { style: labelStyle }, t('preview')),
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

    /**
     * Build the per-provider colour control shown inside one provider card.
     * @param t - bound translator for this plugin's namespace.
     * @returns the keyed slot component.
     */
    function createProviderColorControl(t) {
      return function ProviderColorControl(props) {
        const current = useSettings()
        const entry = props.provider
        const providerId = entry === undefined ? undefined : entry.provider
        if (typeof providerId !== 'string' || providerId === '') return null
        const override = current.colors[providerId]
        const value = override ?? current.accent

        return h('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--dsw-alias-border-l1)',
          },
          'data-provider-color-control': providerId,
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            h('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, t('cardLabel')),
            ...ACCENT_PRESETS.map(preset => swatch({
              key: preset,
              color: preset,
              size: 18,
              active: value === preset,
              onClick: () => { setProviderColor(providerId, preset) },
            })),
            ...colorInputs({ value, ariaLabel: t('cardLabel'), onCommit: hex => { setProviderColor(providerId, hex) } }),
            override === undefined
              ? h('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } }, t('cardDefault'))
              : h('button', {
                type: 'button',
                onClick: () => { clearProviderColor(providerId) },
                style: {
                  padding: '2px 8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 'var(--dsw-radius-sm)',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-secondary)',
                  font: 'inherit',
                  fontSize: '12px',
                  cursor: 'pointer',
                },
              }, t('cardClear'))),
          h('p', { style: { ...hintStyle, margin: 0 } }, t('cardHint')))
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'model-provider-info: dictionaries')

        const ModelLabel = createModelLabel(ctx)
        const SettingsCard = createSettingsCard(t)
        const ProviderColorControl = createProviderColorControl(t)

        ctx.slots.inject('conversation.input.model.label', () => ctx.slots.register(
          { name: 'conversation.input.model.label' },
          ModelLabel,
        ))
        ctx.slots.inject('settings.models.footer', () => ctx.slots.register(
          { name: 'settings.models.footer', id: 'model-provider-info', order: 20 },
          SettingsCard,
        ))

        // The provider-card seat is keyed by the provider row's settings
        // namespace, which is an open string chosen by each adapter family, so
        // one contribution has to be registered per namespace the Host serves.
        // `configForms` is read loosely: a profile without the settings domain
        // simply gets no per-provider controls.
        const configForms = ctx.get('configForms')
        if (configForms === undefined || typeof configForms.describe !== 'function') return
        const mirror = configForms.describe()
        const disposers = new Map()
        const sync = () => {
          let namespaces
          try {
            namespaces = mirror.getSnapshot()?.view?.namespaces ?? []
          } catch {
            return
          }
          const served = new Set(namespaces.map(view => view.ns).filter(ns => typeof ns === 'string' && ns !== ''))
          for (const [ns, dispose] of [...disposers]) {
            if (served.has(ns)) continue
            dispose()
            disposers.delete(ns)
          }
          for (const ns of served) {
            if (disposers.has(ns)) continue
            const dispose = ctx.slots.register(
              { name: 'settings.models.provider-card', key: ns },
              ProviderColorControl,
            )
            disposers.set(ns, typeof dispose === 'function' ? dispose : () => {})
          }
        }
        ctx.effect(() => {
          const off = mirror.subscribe(sync)
          if (typeof mirror.ensure === 'function') void mirror.ensure()
          sync()
          return () => {
            off?.()
            for (const dispose of disposers.values()) dispose()
            disposers.clear()
          }
        }, 'model-provider-info: provider colour controls')
      },
    }
  },
})
