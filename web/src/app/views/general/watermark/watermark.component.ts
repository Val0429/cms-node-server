import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-watermark',
  templateUrl: './watermark.component.html',
  styleUrls: ['./watermark.component.css']
})
export class WatermarkComponent implements OnInit {
  @Input() watermarkInformations: any;
  colorOptions: Object = { color: '#f0b518' };
  fontFamilyOptions = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Impact',
    'Lucida',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Symbol'
  ];
  fontSizeOptions = [
    '8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'
  ];
  constructor() { }

  ngOnInit() { }
}
