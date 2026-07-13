import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';

export const expandCollapse = trigger('expandCollapse', [
  state('collapsed', style({
    height: '0px',
    opacity: 0,
    overflow: 'hidden',
    paddingTop: '0px',
    paddingBottom: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    borderWidth: '0px'
  })),
  state('expanded', style({
    height: '*',
    opacity: 1,
    overflow: 'visible'
  })),
  transition('collapsed <=> expanded', [
    animate('220ms cubic-bezier(0.16, 1, 0.3, 1)')
  ])
]);

export const fadeText = trigger('fadeText', [
  transition(':enter, * => *', [
    style({ opacity: 0, transform: 'translateY(4px)' }),
    animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const modalFadeScale = trigger('modalFadeScale', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.96) translateY(8px)' }),
    animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('180ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'scale(0.96) translateY(8px)' }))
  ])
]);

export const overlayFade = trigger('overlayFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('220ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('180ms ease-in', style({ opacity: 0 }))
  ])
]);

export const toastAnimation = trigger('toastAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px) scale(0.96)' }),
    animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
  ]),
  transition(':leave', [
    animate('180ms cubic-bezier(0.4, 0, 0.2, 1)', style({
      opacity: 0,
      transform: 'scale(0.96)',
      height: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      marginTop: '0px',
      marginBottom: '0px',
      borderWidth: '0px',
      overflow: 'hidden'
    }))
  ])
]);

export const listItem = trigger('listItem', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(16px)' }),
    animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({
      opacity: 0,
      transform: 'scale(0.95)',
      height: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      marginTop: '0px',
      marginBottom: '0px',
      borderWidth: '0px',
      overflow: 'hidden'
    }))
  ])
]);
