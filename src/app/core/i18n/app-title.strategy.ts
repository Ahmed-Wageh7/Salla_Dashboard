import { Title } from '@angular/platform-browser';
import { Injectable, effect, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslationService } from './translation.service';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(TranslationService);
  private latestSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();

    effect(() => {
      this.i18n.language();
      if (this.latestSnapshot) {
        this.updateTitle(this.latestSnapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.latestSnapshot = snapshot;
    const titleKey = this.findTitleKey(snapshot.root);
    const pageTitle = titleKey ? this.i18n.t(titleKey) : this.i18n.t('app.name');

    this.title.setTitle(`${pageTitle} | ${this.i18n.t('app.name')}`);
  }

  private findTitleKey(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    let titleKey: string | null = null;

    while (current) {
      titleKey = (current.data?.['titleKey'] as string | undefined) ?? titleKey;
      current = current.firstChild ?? null;
    }

    return titleKey;
  }
}
