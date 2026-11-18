/**
 * Client half: contributes the composer's inline model label.
 *
 * The `conversation.input.model.label` slot owns every place the composer names
 * the current model — the trigger caption, the root menu's current value, and
 * each selectable row. Without a contribution the selector renders the catalog
 * name alone, so the provider a model comes from is only visible as a group
 * heading inside the open menu. This contribution keeps the catalog name and
 * prefixes it with the provider's localized display name.
 *
 * Emphasis is graded by surface: the two "current selection" surfaces (trigger,
 * menu value) mark a third-party route in the accent colour, because "this
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

    /**
     * Accent for third-party routes. A literal colour rather than a theme token:
     * it is the one deliberate exception, kept in one place so swapping it (or
     * returning to a token) is a single edit.
     */
    const ACCENT = '#F61A43'

    /**
     * First-party routes, matching the product's own first-party ordering
     * (`provider-order.ts` in ui-model-selection, `store.ts` in ui-settings-models).
     * Everything else — a relay, a self-hosted gateway, another vendor — is
     * third-party.
     */
    const FIRST_PARTY_PROVIDERS = new Set(['deepseek-account', 'deepseek-official'])

    /** First-party: the caption tone the selector already uses for the effort suffix. */
    const firstPartyProvider = { color: 'var(--dsw-alias-label-caption)' }

    /**
     * Third-party on the current-selection surfaces: the geometry of Settings'
     * own "Custom" row tag (radius-xs, short padding) in the accent colour,
     * outlined rather than filled — an accent text on a tint of the same hue
     * loses roughly a fifth of its contrast, and the outline already reads as a
     * badge. 12px/600 instead of the tag's 11px/400: the accent is a mid-tone
     * that keeps only ~4:1 against both themes' surfaces, so weight and size
     * carry the legibility that colour alone does not.
     */
    const thirdPartyProvider = {
      color: ACCENT,
      border: `1px solid ${ACCENT}`,
      borderRadius: 'var(--dsw-radius-xs)',
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 600,
      padding: '0 5px',
      whiteSpace: 'nowrap',
    }

    /** Third-party inside the expanded list: weight only, no colour, no chip. */
    const thirdPartyProviderOption = {
      color: 'var(--dsw-alias-label-secondary)',
      fontWeight: 500,
    }

    const separatorTone = { color: 'var(--dsw-alias-label-caption)', padding: '0 2px' }

    /**
     * Render "provider · model" for one placement.
     * @param props - owner share: provider identity, catalog model, placement, selected.
     * @returns the inline label; the selector owns interaction and focus.
     */
    function ModelLabel(props) {
      const { provider, model, placement } = props
      const modelName = model === undefined ? '' : model.name
      if (provider === undefined || provider.name === undefined) {
        return h('span', null, modelName)
      }
      const firstParty = FIRST_PARTY_PROVIDERS.has(provider.id)
      const providerStyle = firstParty
        ? firstPartyProvider
        : placement === 'option' ? thirdPartyProviderOption : thirdPartyProvider
      return h('span', {
        'data-provider-first-label': '',
        'data-provider-kind': firstParty ? 'first-party' : 'third-party',
      },
        h('span', { style: providerStyle }, provider.name),
        h('span', { style: separatorTone, 'aria-hidden': 'true' }, '·'),
        h('span', null, modelName))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.input.model.label', () => ctx.slots.register(
          { name: 'conversation.input.model.label' },
          ModelLabel,
        ))
      },
    }
  },
})
