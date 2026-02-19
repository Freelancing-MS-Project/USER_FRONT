import {AfterViewInit, Component} from '@angular/core';
declare var AOS: any;
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit{


  //ne supprimez pas cette partie du code elle est nécessaire pour le bon fonctionnement de AOS
  ngAfterViewInit(): void {
    AOS.init();
  }




}
