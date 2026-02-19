import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContratRoutingModule } from './contrat-routing.module';
import { ContratComponent } from './contrat.component';


@NgModule({
  declarations: [
    ContratComponent
  ],
  imports: [
    CommonModule,
    ContratRoutingModule
  ]
})
export class ContratModule { }
