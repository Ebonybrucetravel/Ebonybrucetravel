import { Injectable, Logger, HttpException, HttpStatus, GoneException, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class SelectWakanowFlightUseCase {
  private readonly logger = new Logger(SelectWakanowFlightUseCase.name);

  constructor(private readonly wakanowService: WakanowService) {}

  async execute(dto: SelectWakanowFlightDto) {
    const { selectData, targetCurrency = 'NGN' } = dto;

    this.logger.log('Selecting Wakanow flight offer...');
    this.logger.log(`SelectData length: ${selectData?.length || 0}`);

    // ✅ Validate selectData
    if (!selectData) {
      throw new BadRequestException('Missing selectData. Please search for flights again.');
    }

    if (selectData.length < 10) {
      throw new BadRequestException('Invalid selectData (too short). Please search for flights again.');
    }

    try {
      const selectResponse = await this.wakanowService.selectFlight({
        SelectData: selectData,
        TargetCurrency: targetCurrency,
      });

      // ✅ Check if response is valid
      if (!selectResponse) {
        throw new GoneException('No response from Wakanow. Please search again.');
      }

      // ✅ Check if flight is still available
      if (!selectResponse.HasResult) {
        throw new GoneException('Selected flight is no longer available. Please search again.');
      }

      // ✅ Check if we have the required data
      if (!selectResponse.FlightSummaryModel) {
        this.logger.error('Missing FlightSummaryModel in response:', JSON.stringify(selectResponse));
        throw new GoneException('Invalid response from Wakanow. Please search again.');
      }

      const combo = selectResponse.FlightSummaryModel.FlightCombination;

      // ✅ Check if combo exists
      if (!combo) {
        this.logger.error('Missing FlightCombination in response:', JSON.stringify(selectResponse));
        throw new GoneException('Flight data is incomplete. Please search again.');
      }

      // ✅ Check if FlightModels exist
      if (!combo.FlightModels || combo.FlightModels.length === 0) {
        this.logger.error('No FlightModels in response:', JSON.stringify(combo));
        throw new GoneException('No flight segments found. Please search again.');
      }

      this.logger.log(
        `✅ Wakanow flight selected. BookingId: ${selectResponse.BookingId}, Price: ${combo.Price?.Amount || 0} ${combo.Price?.CurrencyCode || 'NGN'}`,
      );

      // ✅ Return with camelCase properties for frontend compatibility
      return {
        provider: 'WAKANOW',
        bookingId: selectResponse.BookingId || null,        // ✅ camelCase
        selectData: selectResponse.SelectData || selectData, // ✅ camelCase
        isPriceMatched: selectResponse.IsPriceMatched || false, // ✅ camelCase
        isPassportRequired: selectResponse.IsPassportRequired || false, // ✅ camelCase
        flightSummary: {                                     // ✅ camelCase
          slices: (combo.FlightModels || []).map((fm) => ({
            airline: fm.AirlineName || fm.Airline || '',
            airlineCode: fm.Airline || '',                   // ✅ camelCase
            airlineLogo: fm.AirlineLogoUrl || '',            // ✅ camelCase
            departureCode: fm.DepartureCode || '',           // ✅ camelCase
            departureName: fm.DepartureName || '',           // ✅ camelCase
            departureTime: fm.DepartureTime || '',           // ✅ camelCase
            arrivalCode: fm.ArrivalCode || '',               // ✅ camelCase
            arrivalName: fm.ArrivalName || '',               // ✅ camelCase
            arrivalTime: fm.ArrivalTime || '',               // ✅ camelCase
            stops: fm.Stops || 0,
            tripDuration: fm.TripDuration || '',             // ✅ camelCase
            segments: (fm.FlightLegs || []).map((leg) => ({
              flightNumber: leg.FlightNumber || '',          // ✅ camelCase
              departureCode: leg.DepartureCode || '',        // ✅ camelCase
              departureName: leg.DepartureName || '',        // ✅ camelCase
              destinationCode: leg.DestinationCode || '',    // ✅ camelCase
              destinationName: leg.DestinationName || '',    // ✅ camelCase
              startTime: leg.StartTime || '',                // ✅ camelCase
              endTime: leg.EndTime || '',                    // ✅ camelCase
              duration: leg.Duration || '',
              cabinClass: leg.CabinClassName || '',          // ✅ camelCase
              operatingCarrier: leg.OperatingCarrierName || '', // ✅ camelCase
              aircraft: leg.Aircraft || '',
              layover: leg.Layover || null,
              layoverDuration: leg.LayoverDuration || '',    // ✅ camelCase
            })),
            freeBaggage: fm.FreeBaggage || null,             // ✅ camelCase
          })),
          price: combo.Price || { Amount: 0, CurrencyCode: targetCurrency },
          priceDetails: combo.PriceDetails || [],            // ✅ camelCase
          isRefundable: combo.IsRefundable || false,         // ✅ camelCase
        },
        fareRules: combo.FareRules || [],                    // ✅ camelCase
        penaltyRules: combo.PenaltyRules || null,            // ✅ camelCase
        termsAndConditions: selectResponse.ProductTermsAndConditions || { // ✅ camelCase
          TermsAndConditions: [],
          TermsAndConditionImportantNotice: '',
        },
        customMessages: selectResponse.CustomMessages || [],  // ✅ camelCase
        message: 'Flight pricing confirmed',
      };

    } catch (error: any) {
      this.logger.error('Error selecting Wakanow flight:', error);

      // ✅ Handle specific errors
      if (error instanceof BadRequestException || error instanceof GoneException) {
        throw error;
      }

      // ✅ Check for expired token or invalid selectData
      const errorMsg = error?.message?.toLowerCase() || '';
      if (
        errorMsg.includes('expired') ||
        errorMsg.includes('invalid') ||
        errorMsg.includes('no longer available') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('unauthorized')
      ) {
        throw new GoneException('Your flight selection has expired. Please search again.');
      }

      // ✅ Check for network errors
      if (
        errorMsg.includes('network') ||
        errorMsg.includes('fetch') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('timeout')
      ) {
        throw new HttpException(
          {
            message: 'Network error connecting to Wakanow. Please try again.',
            error: 'NETWORK_ERROR',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          message: error?.message || 'Failed to confirm flight pricing. Please search again.',
          error: 'SELECT_FAILED',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}