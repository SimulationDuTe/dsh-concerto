import { NS, TEAM_TOOLS, setHostContext } from './api.js'
import { ConcertoPanel } from './components/Panels.js'
import { ConcertoTeamView } from './components/TeamHome.js'
import { ConcertoDock, ConcertoTurnCard, ConcertoToolCard } from './components/ChatIntegration.js'

function registerPluginLocale(ctx) {
  const dict = { zh: { nav: 'Concerto' }, en: { nav: 'Concerto' } }
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => ctx.locale?.register?.(NS, dict), 'concerto: locale')
  } else {
    ctx.locale?.register?.(NS, dict)
  }
}

function injectSlot(ctx, spec, component) {
  if (ctx.slots && typeof ctx.slots.inject === 'function') {
    ctx.slots.inject(spec.name, () => ctx.slots.register(spec, component))
  } else if (ctx.slots && typeof ctx.slots.register === 'function') {
    ctx.slots.register(spec, component)
  }
}

export default {
  inject: ['slots', 'locale'],
  apply(ctx) {
    setHostContext(ctx)
    registerPluginLocale(ctx)

    const labelOf = (text) => ({ label: () => text, locale: NS })

    injectSlot(ctx, { name: 'conversation.view', id: 'concerto.team', order: 10, ...labelOf('团队') }, ConcertoTeamView)
    injectSlot(ctx, { name: 'settings.section', id: 'concerto.section', order: 90, ...labelOf('Concerto') }, ConcertoPanel)
    injectSlot(ctx, { name: 'conversation.composer.dock', id: 'concerto.members', order: 50, label: 'Concerto' }, ConcertoDock)
    injectSlot(ctx, { name: 'conversation.chat.turnTail', id: 'concerto.turn-team', order: 50 }, ConcertoTurnCard)

    for (const toolName of TEAM_TOOLS) {
      injectSlot(
        ctx,
        { name: 'tool.call.toolview', id: 'concerto.tool.' + toolName, key: toolName },
        (props) => ConcertoToolCard({ toolName, ...props }),
      )
    }
  },
}
