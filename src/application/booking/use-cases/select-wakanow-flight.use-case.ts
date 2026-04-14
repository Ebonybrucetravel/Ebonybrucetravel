import { Injectable, Logger } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';
@Injectable()
export class SelectWakanowFlightUseCase {
  private readonly logger = new Logger(SelectWakanowFlightUseCase.name);
  constructor(private readonly wakanowService: WakanowService) {}
  async execute(dto: SelectWakanowFlightDto) {
    const { selectData, targetCurrency = 'NGN' } = dto;
    this.logger.log('Selecting Wakanow flight offer...');
    const selectResponse = await this.wakanowService.selectFlight({
      SelectData: selectData,
      TargetCurrency: targetCurrency,
    });
    const combo = selectResponse.FlightSummaryModel.FlightCombination;
    return {
      provider: 'WAKANOW',
      booking_id: selectResponse.BookingId,
      is_price_matched: selectResponse.IsPriceMatched,
      is_passport_required: selectResponse.IsPassportRequired,
      select_data: selectResponse.SelectData,
      flight_summary: {
        slices: combo.FlightModels.map((fm) => ({
          airline: fm.AirlineName,
          airline_code: fm.Airline,
          airline_logo: fm.AirlineLogoUrl,
          departure_code: fm.DepartureCode,
          departure_name: fm.DepartureName,
          departure_time: fm.DepartureTime,
          arrival_code: fm.ArrivalCode,
          arrival_name: fm.ArrivalName,
          arrival_time: fm.ArrivalTime,
          stops: fm.Stops,
          trip_duration: fm.TripDuration,
          segments: fm.FlightLegs.map((leg) => ({
            flight_number: leg.FlightNumber,
            departure_code: leg.DepartureCode,
            departure_name: leg.DepartureName,
            destination_code: leg.DestinationCode,
            destination_name: leg.DestinationName,
            start_time: leg.StartTime,
            end_time: leg.EndTime,
            duration: leg.Duration,
            cabin_class: leg.CabinClassName,
            operating_carrier: leg.OperatingCarrierName,
            aircraft: leg.Aircraft,
            layover: leg.Layover,
            layover_duration: leg.LayoverDuration,
          })),
          free_baggage: fm.FreeBaggage,
        })),
        price: combo.Price,
        price_details: combo.PriceDetails,
        is_refundable: combo.IsRefundable,
      },
      fare_rules: combo.FareRules,
      penalty_rules: combo.PenaltyRules,
      terms_and_conditions: selectResponse.ProductTermsAndConditions,
      custom_messages: selectResponse.CustomMessages,
    };
  }
}
