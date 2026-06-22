import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

// ✅ Configuration constants - move these to your config file
const MARKUP_PERCENTAGE = 10; // 10%
const SERVICE_FEE_PERCENTAGE = 5; // 5%

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

    // ✅ Log a preview of the selectData for debugging
    this.logger.log(`SelectData preview: ${selectData.substring(0, 50)}...`);

    try {
      const selectResponse = await this.wakanowService.selectFlight({
        SelectData: selectData,
        TargetCurrency: targetCurrency,
      });

      // ✅ Check if response is valid
      if (!selectResponse) {
        throw new BadRequestException('No response from Wakanow. Please search again.');
      }

      // ✅ Check if flight is still available
      if (!selectResponse.HasResult) {
        throw new BadRequestException('Selected flight is no longer available. Please search again.');
      }

      // ✅ Check if we have the required data
      if (!selectResponse.FlightSummaryModel) {
        this.logger.error('Missing FlightSummaryModel in response:', JSON.stringify(selectResponse));
        throw new BadRequestException('Invalid response from Wakanow. Please search again.');
      }

      const combo = selectResponse.FlightSummaryModel.FlightCombination;

      // ✅ Check if combo exists
      if (!combo) {
        this.logger.error('Missing FlightCombination in response:', JSON.stringify(selectResponse));
        throw new BadRequestException('Flight data is incomplete. Please search again.');
      }

      // ✅ Check if FlightModels exist
      if (!combo.FlightModels || combo.FlightModels.length === 0) {
        this.logger.error('No FlightModels in response:', JSON.stringify(combo));
        throw new BadRequestException('No flight segments found. Please search again.');
      }

      // ✅ Get the total price from Wakanow
      const totalAmount = combo.Price?.Amount || 0;
      const currency = combo.Price?.CurrencyCode || targetCurrency || 'NGN';
      
      // ✅ Calculate price breakdown with markup and service fee as taxes
      const markupPct = MARKUP_PERCENTAGE;
      const servicePct = SERVICE_FEE_PERCENTAGE;
      const totalFactor = 1 + (markupPct / 100) + (servicePct / 100);
      
      // Calculate base price (before markup and service fee)
      const basePrice = totalAmount / totalFactor;
      const markupAmount = (basePrice * markupPct) / 100;
      const serviceFee = (basePrice * servicePct) / 100;
      
      // Round to 2 decimal places
      const roundedBasePrice = Math.round(basePrice * 100) / 100;
      const roundedMarkup = Math.round(markupAmount * 100) / 100;
      const roundedServiceFee = Math.round(serviceFee * 100) / 100;
      const roundedTotal = Math.round(totalAmount * 100) / 100;
      
      // ✅ Combined taxes = markup + service fee (displayed as one line)
      const combinedTaxes = roundedMarkup + roundedServiceFee;
      const combinedTaxPercentage = markupPct + servicePct;

      // ✅ Create the price breakdown object
      const priceBreakdown = {
        basePrice: roundedBasePrice,
        markupAmount: roundedMarkup,
        markupPercentage: markupPct,
        serviceFee: roundedServiceFee,
        serviceFeePercentage: servicePct,
        taxes: combinedTaxes,
        taxPercentage: combinedTaxPercentage,
        totalAmount: roundedTotal,
        currency: currency,
      };

      this.logger.log(
        `✅ Wakanow flight selected. BookingId: ${selectResponse.BookingId}, ` +
        `Base: ${roundedBasePrice}, Markup: ${roundedMarkup}, Service: ${roundedServiceFee}, ` +
        `Taxes: ${combinedTaxes}, Total: ${roundedTotal} ${currency}`,
      );

      // ✅ Log the price breakdown for debugging
      this.logger.log('💰 Price breakdown:', priceBreakdown);

      // ✅ Return with camelCase properties for frontend compatibility
      return {
        provider: 'WAKANOW',
        bookingId: selectResponse.BookingId || null,
        selectData: selectResponse.SelectData || selectData,
        isPriceMatched: selectResponse.IsPriceMatched || false,
        isPassportRequired: selectResponse.IsPassportRequired || false,
        
        // ✅ Price breakdown - frontend will display these as-is
        priceBreakdown: priceBreakdown,
        
        // ✅ Also store individual fields for easier access
        basePrice: roundedBasePrice,
        markupAmount: roundedMarkup,
        markupPercentage: markupPct,
        serviceFee: roundedServiceFee,
        serviceFeePercentage: servicePct,
        taxes: combinedTaxes,
        taxPercentage: combinedTaxPercentage,
        totalAmount: roundedTotal,
        currency: currency,
        
        flightSummary: {
          slices: (combo.FlightModels || []).map((fm) => ({
            airline: fm.AirlineName || fm.Airline || '',
            airlineCode: fm.Airline || '',
            airlineLogo: fm.AirlineLogoUrl || '',
            departureCode: fm.DepartureCode || '',
            departureName: fm.DepartureName || '',
            departureTime: fm.DepartureTime || '',
            arrivalCode: fm.ArrivalCode || '',
            arrivalName: fm.ArrivalName || '',
            arrivalTime: fm.ArrivalTime || '',
            stops: fm.Stops || 0,
            tripDuration: fm.TripDuration || '',
            segments: (fm.FlightLegs || []).map((leg) => ({
              flightNumber: leg.FlightNumber || '',
              departureCode: leg.DepartureCode || '',
              departureName: leg.DepartureName || '',
              destinationCode: leg.DestinationCode || '',
              destinationName: leg.DestinationName || '',
              startTime: leg.StartTime || '',
              endTime: leg.EndTime || '',
              duration: leg.Duration || '',
              cabinClass: leg.CabinClassName || '',
              operatingCarrier: leg.OperatingCarrierName || '',
              aircraft: leg.Aircraft || '',
              layover: leg.Layover || null,
              layoverDuration: leg.LayoverDuration || '',
            })),
            freeBaggage: fm.FreeBaggage || null,
          })),
          price: combo.Price || { Amount: 0, CurrencyCode: currency },
          priceDetails: combo.PriceDetails || [],
          isRefundable: combo.IsRefundable || false,
        },
        fareRules: combo.FareRules || [],
        penaltyRules: combo.PenaltyRules || null,
        termsAndConditions: selectResponse.ProductTermsAndConditions || {
          TermsAndConditions: [],
          TermsAndConditionImportantNotice: '',
        },
        customMessages: selectResponse.CustomMessages || [],
        message: 'Flight pricing confirmed',
      };

    } catch (error: any) {
      this.logger.error('Error selecting Wakanow flight:', error);

      // ✅ Handle specific errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      // ✅ Check if the error is a SELECTION_EXPIRED from WakanowService
      if (error.message === 'SELECTION_EXPIRED') {
        this.logger.warn('Wakanow selection expired');
        throw new BadRequestException('Your flight selection has expired. Please search for flights again.');
      }

      // ✅ Extract error details more robustly
      const errorMsg = error?.message?.toLowerCase() || '';
      const errorString = JSON.stringify(error)?.toLowerCase() || '';
      
      // ✅ Try to get status from various places
      const errorStatus = error?.status || 
                         error?.response?.status || 
                         error?.response?.statusCode || 
                         error?.statusCode || 
                         error?.code ||
                         0;

      // ✅ Check for "Bad Request" in the error response
      const isBadRequest = errorMsg.includes('bad request') || 
                          errorString.includes('bad request') ||
                          errorMsg.includes('selectdata') ||
                          errorString.includes('selectdata') ||
                          errorMsg.includes('invalid') ||
                          errorString.includes('invalid') ||
                          errorMsg.includes('expired') ||
                          errorString.includes('expired');

      // ✅ Check if it's a 500 or 400 error from Wakanow with "Bad Request"
      if ((errorStatus === 500 || errorStatus === 400) && isBadRequest) {
        this.logger.warn(`Wakanow select rejected with ${errorStatus}: ${error.message}`);
        throw new BadRequestException('Your flight selection has expired. Please search for flights again.');
      }

      // ✅ Check if it's a 500 Internal Server Error from Wakanow
      if (errorStatus === 500) {
        this.logger.warn(`Wakanow select rejected with 500: ${error.message}`);
        throw new BadRequestException('Your flight selection has expired or is invalid. Please search for flights again.');
      }
      
      // ✅ Check if it's a 400 Bad Request from Wakanow (expired selectData)
      if (errorStatus === 400) {
        this.logger.warn(`Wakanow select rejected with 400: ${error.message}`);
        throw new BadRequestException('Your flight selection has expired. Please search for flights again.');
      }

      if (
        errorMsg.includes('expired') ||
        errorMsg.includes('invalid') ||
        errorMsg.includes('no longer available') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('unauthorized')
      ) {
        throw new BadRequestException('Your flight selection has expired. Please search again.');
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