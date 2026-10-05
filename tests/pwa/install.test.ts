import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstallUi } from '../../src/features/install/install-ui';
import { createI18n } from '../../src/i18n';
import { createInstaller, type InstallEnv } from '../../src/pwa/install';
import { Scope } from '../../src/ui/scope';

/** Une fausse fenêtre qui sait émettre des événements. */
function fakeEnv(over: { standalone?: boolean; ios?: boolean } = {}) {
  const target = new EventTarget();
  const env: InstallEnv = {
    window: target as unknown as InstallEnv['window'],
    isStandalone: () => over.standalone ?? false,
    isIos: () => over.ios ?? false,
  };
  const promptEvent = (outcome: 'accepted' | 'dismissed') => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    event.prompt = vi.fn(() => Promise.resolve());
    event.userChoice = Promise.resolve({ outcome });
    target.dispatchEvent(event);
    return event;
  };
  return { env, target, promptEvent };
}

describe("proposer l'installation", () => {
  it('déjà installée : rien à proposer', () => {
    const { env, promptEvent } = fakeEnv({ standalone: true });
    const installer = createInstaller(env);
    expect(installer.state.get()).toBe('installed');
    promptEvent('accepted');
    expect(installer.state.get()).toBe('installed');
  });

  it('iPhone / iPad : une aide (pas de bouton natif)', () => {
    expect(createInstaller(fakeEnv({ ios: true }).env).state.get()).toBe('ios');
  });

  it('ailleurs sans proposition du navigateur : rien', () => {
    expect(createInstaller(fakeEnv().env).state.get()).toBe('none');
  });

  it('Android / ordinateur : on garde la proposition du navigateur et on la lance sur demande', async () => {
    const { env, promptEvent } = fakeEnv();
    const installer = createInstaller(env);
    const event = promptEvent('accepted');
    expect(event.defaultPrevented).toBe(true); // pas de mini-bandeau du navigateur
    expect(installer.state.get()).toBe('prompt');
    expect(await installer.prompt()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(installer.state.get()).toBe('installed');
    expect(await installer.prompt()).toBe('unavailable'); // une proposition ne sert qu'une fois
  });

  it('refus : on revient à l’état d’avant', async () => {
    const { env, promptEvent } = fakeEnv();
    const installer = createInstaller(env);
    promptEvent('dismissed');
    expect(await installer.prompt()).toBe('dismissed');
    expect(installer.state.get()).toBe('none');
  });

  it('« appinstalled » (installée par un autre chemin) : état installé', () => {
    const { env, target } = fakeEnv();
    const installer = createInstaller(env);
    target.dispatchEvent(new Event('appinstalled'));
    expect(installer.state.get()).toBe('installed');
  });

  it('après stop(), les événements sont ignorés', () => {
    const { env, promptEvent } = fakeEnv();
    const installer = createInstaller(env);
    installer.stop();
    promptEvent('accepted');
    expect(installer.state.get()).toBe('none');
  });
});

describe('bandeau et aide d’installation', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.localStorage.clear();
  });

  function mount(over: { standalone?: boolean; ios?: boolean } = {}) {
    const fake = fakeEnv(over);
    const installer = createInstaller(fake.env);
    const ui = createInstallUi({ i18n: createI18n('fr'), scope: new Scope(), installer });
    document.body.append(ui.banner, ui.modal.element);
    return { ...fake, installer, ui };
  }

  it('caché tant qu’il n’y a rien à proposer', () => {
    expect(mount().ui.banner.hidden).toBe(true);
  });

  it('iPhone : bandeau, puis aide pas à pas', () => {
    const { ui } = mount({ ios: true });
    expect(ui.banner.hidden).toBe(false);
    const button = ui.banner.querySelector<HTMLButtonElement>('.install-btn')!;
    expect(button.textContent).toBe('Comment faire ?');
    button.click();
    expect(ui.modal.element.open).toBe(true);
    expect(ui.modal.element.querySelectorAll('.install-steps li')).toHaveLength(3);
    expect(ui.modal.element.textContent).toContain('Sur l’écran d’accueil');
  });

  it('Android : le bouton déclenche l’installation du navigateur', async () => {
    const { ui, promptEvent, installer } = mount();
    const event = promptEvent('accepted');
    expect(ui.banner.hidden).toBe(false);
    const button = ui.banner.querySelector<HTMLButtonElement>('.install-btn')!;
    expect(button.textContent).toBe('Installer');
    button.click();
    await vi.waitFor(() => expect(installer.state.get()).toBe('installed'));
    expect(event.prompt).toHaveBeenCalled();
    expect(ui.banner.hidden).toBe(true);
  });

  it('fermer le bandeau est définitif (mémorisé)', () => {
    const first = mount({ ios: true });
    first.ui.banner.querySelector<HTMLButtonElement>('.install-close')!.click();
    expect(first.ui.banner.hidden).toBe(true);
    document.body.replaceChildren();
    expect(mount({ ios: true }).ui.banner.hidden).toBe(true); // au prochain lancement aussi
  });

  it('le bouton permanent (page « À propos ») reste disponible après avoir fermé le bandeau', () => {
    const { ui } = mount({ ios: true });
    ui.banner.querySelector<HTMLButtonElement>('.install-close')!.click();
    const button = ui.actionButton('about-install');
    expect(button.hidden).toBe(false);
    expect(button.textContent).toBe('Comment faire ?');
  });

  it('installée : plus aucun bouton', () => {
    const { ui } = mount({ standalone: true });
    expect(ui.actionButton('x').hidden).toBe(true);
  });
});
