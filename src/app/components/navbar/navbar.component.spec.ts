import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NavbarComponent } from './navbar.component';
import { AppAuthService } from '../../services/keycloak.service';

const appAuthServiceMock = {
  authState$: of({ isAuthenticated: false, username: null }),
  syncAuthState: jasmine.createSpy('syncAuthState').and.resolveTo(),
  login: jasmine.createSpy('login').and.resolveTo(),
  logout: jasmine.createSpy('logout').and.resolveTo(),
};

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NavbarComponent],
      providers: [{ provide: AppAuthService, useValue: appAuthServiceMock }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
