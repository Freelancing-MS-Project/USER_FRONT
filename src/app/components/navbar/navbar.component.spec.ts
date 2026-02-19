import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services/auth.service';

const authServiceMock = {
  authState$: of({ isAuthenticated: false, username: null }),
  syncAuthState: jasmine.createSpy('syncAuthState'),
  login: jasmine.createSpy('login').and.returnValue(of(void 0)),
  logout: jasmine.createSpy('logout'),
};

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [NavbarComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
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
