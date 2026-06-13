import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {AuthService} from "../../core/auth/auth.service";

@Component({
  selector: 'app-register-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register-client.component.html',
  styleUrls: ['./register-client.component.css']
})
export class RegisterClientComponent {

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';

  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister(): void {
    this.errorMessage = '';

    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;

    this.authService.registerClient({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/Client_Space']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Erreur inscription:', err);
        this.errorMessage = 'Erreur lors de la création du compte.';
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
