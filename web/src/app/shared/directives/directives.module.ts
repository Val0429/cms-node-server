import { NgModule } from '@angular/core';

import 'd3';
import 'nvd3';
import { Nvd3Chart } from './nvd3/nvd3.directive';

import 'jquery-sparkline';
import { JqSparkline } from './sparkline/sparkline.directive';

import 'jquery-flot';
import 'jquery.flot.animator/jquery.flot.animator';
import 'jquery-flot/jquery.flot.time.js';

import { FlotChart } from './flot/flot.directive';
import { FlotChartAnimator } from './flot/flot-chart-animator.directive';

import 'webpack-raphael';
import 'morris.js/morris.js';
import { MorrisChart } from './morris/morris.directive';

import 'rickshaw';
import { RickshawChart } from './rickshaw/rickshaw.directive';

import { EditableDirective } from './editable.directive';
import { WidgetDirective } from './widget.directive';
import { CheckAll } from './check-all/check-all.directive';
import { Select2Directive } from './select2.directive';
import { DatepickerDirective } from './datepicker.directive';
import { TimepickerDirective } from './timepicker.directive';

@NgModule({
  exports: [
    Nvd3Chart,
    JqSparkline,
    FlotChart,
    FlotChartAnimator,
    MorrisChart,
    RickshawChart,
    EditableDirective,
    WidgetDirective,
    CheckAll,
    Select2Directive,
    DatepickerDirective,
    TimepickerDirective
  ],
  declarations: [
    Nvd3Chart,
    JqSparkline,
    FlotChart,
    FlotChartAnimator,
    MorrisChart,
    RickshawChart,
    EditableDirective,
    WidgetDirective,
    CheckAll,
    Select2Directive,
    DatepickerDirective,
    TimepickerDirective
  ]
})
export class DirectivesModule { }
