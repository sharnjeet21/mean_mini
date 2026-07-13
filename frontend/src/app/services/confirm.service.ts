import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmService {
  isOpen = signal(false);
  config = signal<ConfirmConfig | null>(null);
  private resultSubject = new Subject<boolean>();

  confirm(config: ConfirmConfig): Promise<boolean> {
    this.config.set({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'info',
      ...config,
    });
    this.isOpen.set(true);
    this.resultSubject = new Subject<boolean>();
    return new Promise<boolean>((resolve) => {
      this.resultSubject.asObservable().subscribe((res) => {
        resolve(res);
      });
    });
  }

  resolve(value: boolean) {
    this.isOpen.set(false);
    this.resultSubject.next(value);
    this.resultSubject.complete();
  }
}
