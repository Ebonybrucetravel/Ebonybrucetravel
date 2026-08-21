import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

const MARKUP_PERCENTAGE = 10;
const SERVICE_FEE_PERCENTAGE = 5;
const MAX_RETRIES = 2; 
const RETRY_DELAY = 1000;

@Injectable()
export class SelectWakanowFlightUseCase {
  private readonly logger = new Logger(SelectWakanowFlightUseCase.name);

  constructor(private readonly wakanowService: WakanowService) {}

  async execute(dto: SelectWakanowFlightDto) {
    const { selectData, targetCurrency = 'NGN', searchParams, flightIndex } = dto;

    this.logger.log('Selecting Wakanow flight offer...');
    this.logger.log(`SelectData length: ${selectData?.length || 0}`);

    if (!selectData) {
      throw new BadRequestException('Missing selectData. Please search for flights again.');
    }

    if (selectData.length < 10) {
      throw new BadRequestException('Invalid selectData (too short). Please search for flights again.');
    }

    this.logger.log(`SelectData preview: ${selectData.substring(0, 50)}...`);

    const selectDataVariants = this.generateSelectDataVariants(selectData);
    this.logger.log(`Generated ${selectDataVariants.length} SelectData variants to try`);

    let lastError: any = null;
    let selectResponse = null;
    let hasRefreshed = false;

    for (let variantIndex = 0; variantIndex < selectDataVariants.length; variantIndex++) {
      const variant = selectDataVariants[variantIndex];
      this.logger.log(`Trying variant ${variantIndex + 1}/${selectDataVariants.length}: ${variant.name}`);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          this.logger.log(`Attempt ${attempt}/${MAX_RETRIES} with variant ${variant.name}...`);

          selectResponse = await this.wakanowService.selectFlight({
            SelectData: variant.data,
            TargetCurrency: targetCurrency,
          });

          if (selectResponse) {
            this.logger.log(`✅ Successfully selected flight with variant: ${variant.name}`);
            break;
          }

        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message?.toLowerCase() || '';
          const errorString = JSON.stringify(error)?.toLowerCase() || '';

          const isExpired = errorMsg.includes('expired') ||
                            errorMsg.includes('selectdata') ||
                            errorMsg.includes('bad request') ||
                            errorMsg.includes('an error has occured') ||
                            errorMsg.includes('selected flights not available') ||
                            errorString.includes('expired') ||
                            errorString.includes('selectdata');

          if (isExpired) {
            this.logger.warn(`⚠️ Variant ${variant.name} expired`);
            
            // 🔥 AUTO-REFRESH: Only try once
            if (variant.name === 'Original' && searchParams && !hasRefreshed) {
              hasRefreshed = true;
              this.logger.log('🔄 Auto-refreshing search to get new selectData...');
              
              try {
                const freshResults = await this.wakanowService.searchFlights(searchParams);
                
                if (freshResults && freshResults.length > 0) {
                  const idx = flightIndex || 0;
                  const matchingFlight = freshResults[idx] || freshResults[0];
                  
                  if (matchingFlight?.SelectData) {
                    this.logger.log(`✅ Found fresh selectData, retrying...`);
                    
                    selectResponse = await this.wakanowService.selectFlight({
                      SelectData: matchingFlight.SelectData,
                      TargetCurrency: targetCurrency,
                    });
                    
                    if (selectResponse) {
                      this.logger.log('✅ Success with refreshed data!');
                      break;
                    }
                  }
                }
              } catch (refreshError) {
                this.logger.error('Auto-refresh failed:', refreshError);
              }
            }
            
            if (!selectResponse) {
              throw new BadRequestException(
                'Your flight selection has expired. Please search for flights again.'
              );
            }
          }

          if (attempt < MAX_RETRIES) {
            this.logger.warn(`Attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            continue;
          }

          this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
          break;
        }
      }

      if (selectResponse) {
        break;
      }
    }

    if (!selectResponse) {
      this.logger.error('All attempts failed');
      throw new BadRequestException(
        'Unable to confirm flight pricing. Please search for flights again.'
      );
    }


    if (!selectResponse.HasResult) {
      throw new BadRequestException('Selected flight is no longer available. Please search again.');
    }

    if (!selectResponse.FlightSummaryModel) {
      this.logger.error('Missing FlightSummaryModel in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Invalid response from Wakanow. Please search again.');
    }

    const combo = selectResponse.FlightSummaryModel.FlightCombination;

    if (!combo) {
      this.logger.error('Missing FlightCombination in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Flight data is incomplete. Please search again.');
    }

    if (!combo.FlightModels || combo.FlightModels.length === 0) {
      this.logger.error('No FlightModels in response:', JSON.stringify(combo));
      throw new BadRequestException('No flight segments found. Please search again.');
    }
   // ✅ CORRECTED STOP INFORMATION LOGGING
this.logger.log('=== WAKANOW STOP INFORMATION DEBUG ===');
combo.FlightModels?.forEach((fm: any, index: number) => {
  this.logger.log(`Flight ${index + 1}: ${fm.AirlineName} (${fm.Airline})`);
  this.logger.log(`  Total Stops (Layovers): ${fm.Stops}`);
  this.logger.log(`  Total Layover Time: ${fm.StopTime}`);
  this.logger.log(`  Layover City: ${fm.StopCity || 'N/A'}`);
  
  fm.FlightLegs?.forEach((leg: any, legIndex: number) => {
    this.logger.log(`  Leg ${legIndex + 1}: ${leg.DepartureCode} -> ${leg.DestinationCode}`);
    this.logger.log(`    Duration: ${leg.Duration}`);
    this.logger.log(`    Has Layover: ${leg.Layover ? 'Yes' : 'No'}`);
    if (leg.Layover) {
      this.logger.log(`    Layover Location: ${leg.Layover}`);
      this.logger.log(`    Layover Duration: ${leg.LayoverDuration}`);
    }
    // ✅ Properly check for TECHNICAL STOPS
    const hasTechnicalStops = leg.TechnicalStops && leg.TechnicalStops.length > 0;
    this.logger.log(`    Has Technical Stops: ${hasTechnicalStops ? 'Yes' : 'No'}`);
    if (hasTechnicalStops) {
      this.logger.log(`    Technical Stops: ${JSON.stringify(leg.TechnicalStops)}`);
    }
    this.logger.log(`    IsStop flag: ${leg.IsStop}`);
  });
});
this.logger.log('=== END DEBUG ===');


    const totalAmount = combo.Price?.Amount || 0;
    const currency = combo.Price?.CurrencyCode || targetCurrency || 'NGN';
    
    const markupPct = MARKUP_PERCENTAGE;
    const servicePct = SERVICE_FEE_PERCENTAGE;
    const totalFactor = 1 + (markupPct / 100) + (servicePct / 100);
    
    const basePrice = totalAmount / totalFactor;
    const markupAmount = (basePrice * markupPct) / 100;
    const serviceFee = (basePrice * servicePct) / 100;
    
    const roundedBasePrice = Math.round(basePrice * 100) / 100;
    const roundedMarkup = Math.round(markupAmount * 100) / 100;
    const roundedServiceFee = Math.round(serviceFee * 100) / 100;
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    
    const combinedTaxes = roundedMarkup + roundedServiceFee;
    const combinedTaxPercentage = markupPct + servicePct;

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

    const bookingId = selectResponse.BookingId || null;
    const selectDataResponse = selectResponse.SelectData || selectData;

    // ✅ Get terms from Wakanow
    const wakanowTerms = selectResponse.ProductTermsAndConditions?.TermsAndConditions || [];
    
    // ✅ Fallback terms from Wakanow API Documentation (Page 19-20)
    const documentedTerms = [
      "Cancellation and Date Change penalty applicable. Penalty amount will depend on the Date and Time of Cancellation or Date Change.",
      "WAKANOW BLACK FRIDAY AND CYBER MONDAY TERMS AND CONDITIONS.",
      "The Black Friday deals may be applied to selected or stand-alone bookings for flights, hotels and other travel products or flight bookings in combination with any other product such as hotels, tours, airport drop off and pick up, protocol services etc.",
      "All booking/reservations made by {AgentName} are subject to third party operating Airline's rules and terms of carriage.",
      "All Black Friday customers must check all details to ensure how the deals work.",
      "{AgentName} merely acts as a travel agent of third party operating Airlines and SHALL have NO responsibility, whatsoever, for any additional cost (directly or indirectly) incurred by any passenger due to any delay, loss, cancellation, change, inaccurate/insufficient information arising whether during booking reservation or after ticket issuance.",
      "All Black Friday customers must note that Fares are nonrefundable and nontransferable.",
      "All the Arik Air flight bookings/reservations are subject to airline availability and are valid for 1 (one) hour from time of booking to payment confirmation and ticket issuance.",
      "The Black Friday deals are discounted and therefore do not include taxes, supplier fees, cancellation or change fees/penalties, administrative fees or other miscellaneous charges, which are the sole responsibility of the customer.",
      "All flight fare quoted by {AgentName} are subject to availability, and to change at any time by the third party Airline operators.",
      "All booking/reservations made on Wakanow.com are subject to third party operating Airline's rules and terms of carriage.",
      "Passengers are liable for; all card transactions (whether successful or not) travel details, compliance and adequacy of visa requirements, travel itinerary and names (as appear on passport) provided for bookings.",
      "Ticket issuance SHALL BE subject to payment confirmation by Wakanow.",
      "Ticket issuance SHALL BE subject to payment confirmation by {AgentName}.",
      "Please ensure that your International passport has at least 6 (six) months validity prior to its expiration date as Wakanow shall not be liable for any default.",
      "Please ensure that your International passport has at least 6 (six) months validity prior to its expiration date as {AgentName} shall not be liable for any default.",
      "Wakanow merely acts as a travel agent of third party operating Airlines and SHALL have NO responsibility, whatsoever, for any additional cost (directly or indirectly) incurred by any passenger due to any delay, loss, cancellation, change, inaccurate/insufficient information arising whether during booking reservation or after ticket issuance.",
      "All the Arik Air flight bookings/reservations are subject to airline availability and are valid for 1 (one) hour from time of booking to payment confirmation and ticket issuance.",
      "For all non-card transactions, please contact us at 07009252669, 01-6329250, 01-2773010 to confirm booking details, travel dates and travel requirements before proceeding to payment.",
      "Refund, cancellation and change requests, where applicable, are subject to third party operating airline's policy, plus a service charge of $50.",
      "All flight fare quoted on www.wakanow.com are subject to availability, and to change at any time by the third party Airline operators.",
      "Refund settlement in 9 above, shall be pursuant to fund remittance by the operating airline.",
      "Passengers are advised to arrive at the airport at least 3-5 hours prior to flight departure.",
      "First time travelers are advised to have a return flight ticket, confirmed hotel/accommodation and a minimum of $1000 for Personal Travel Allowance (PTA) or Business Travel Allowance (BTA).",
      "An original child's Birth Certificate and Consent letter from parent(s) must be presented before the check-in counter at the Airport.",
      "All tickets are non-transferable at any time. Some tickets may be non-refundable or non-changeable.",
      "Some Airlines may require additional Medical Report/Documents in the case of pregnant passenger(s).",
      "The Passenger hereby confirms to have read and understood this booking information notice and has agreed to waive all rights, by law and to hold harmless and absolve Wakanow of all liabilities that may arise thereof.",
    ];

    const displayTerms = wakanowTerms.length > 0 ? wakanowTerms : documentedTerms;

    this.logger.log(
      `✅ Wakanow flight selected. BookingId: ${bookingId}, ` +
      `Base: ${roundedBasePrice}, Markup: ${roundedMarkup}, Service: ${roundedServiceFee}, ` +
      `Taxes: ${combinedTaxes}, Total: ${roundedTotal} ${currency}`,
    );

    return {
      provider: 'WAKANOW',
      bookingId: bookingId,
      pnrNumber: bookingId,
      wakanowBookingId: bookingId,
      selectData: selectDataResponse,
      isPriceMatched: selectResponse.IsPriceMatched || false,
      isPassportRequired: selectResponse.IsPassportRequired || false,
      
      priceBreakdown: priceBreakdown,
      
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
          stopTime: fm.StopTime || '',
          stopCity: fm.StopCity || null,
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
            isStop: leg.IsStop || false,
            layover: leg.Layer || leg.Layover || null,
            layoverDuration: leg.LayerDuration || leg.LayoverDuration || '',
            bookingClass: leg.BookingClass || '',
            fareType: leg.FareType || '',
            fareBasisCode: leg.FarebasisCode || '',
            technicalStops: leg.TechnicalStops || [],
            hasTechnicalStops: (leg.TechnicalStops || []).length > 0,
          })),
          freeBaggage: fm.FreeBaggage || null,
          stopDetails: {
            hasStop: (fm.Stops || 0) > 0,
            stopCount: fm.Stops || 0,
            totalStopTime: fm.StopTime || '',
            stopLocations: (fm.FlightLegs || [])
              .filter(leg => leg.IsStop || leg.Layer || leg.Layover)
              .map(leg => ({
                location: leg.Layer || leg.Layover || '',
                duration: leg.LayerDuration || leg.LayoverDuration || '',
                arrivalCode: leg.DestinationCode || '',
                arrivalName: leg.DestinationName || '',
                departureCode: leg.DepartureCode || '',
                departureName: leg.DepartureName || '',
              })),
          },
        })),
        price: combo.Price || { Amount: 0, CurrencyCode: currency },
        priceDetails: combo.PriceDetails || [],
        isRefundable: combo.IsRefundable || false,
      },
      fareRules: combo.FareRules || [],
      penaltyRules: combo.PenaltyRules || null,
    
      termsAndConditions: {
        TermsAndConditions: displayTerms,
        TermsAndConditionImportantNotice: selectResponse.ProductTermsAndConditions?.TermsAndConditionImportantNotice || '',
      },
      customMessages: selectResponse.CustomMessages || [],
      message: 'Flight pricing confirmed',
      

      stopInformation: {
        totalStops: combo.FlightModels?.reduce((acc: number, fm: any) => acc + (fm.Stops || 0), 0) || 0,
        
        stopDetails: combo.FlightModels?.map((fm: any) => ({
          airline: fm.AirlineName,
          stops: fm.Stops || 0,
          stopTime: fm.StopTime || '',
          stopCity: fm.StopCity || null,
          legs: (fm.FlightLegs || []).map((leg: any) => ({
            departureCode: leg.DepartureCode,
            destinationCode: leg.DestinationCode,
            hasStop: !!(leg.Layer || leg.Layover),
            stopLocation: leg.Layer || leg.Layover || null,
            stopDuration: leg.LayerDuration || leg.LayoverDuration || '',
            isStop: leg.IsStop || false,
            hasTechnicalStops: (leg.TechnicalStops || []).length > 0,
            technicalStops: leg.TechnicalStops || [],
          })),
        })),
      
        technicalStops: (combo.FlightModels || []).flatMap((fm: any) => 
          (fm.FlightLegs || [])
            .filter((leg: any) => (leg.TechnicalStops || []).length > 0)
            .flatMap((leg: any) => 
              (leg.TechnicalStops || []).map((stop: any) => ({
                airline: fm.AirlineName,
                flightNumber: leg.FlightNumber,
                legFrom: leg.DepartureCode,
                legFromName: leg.DepartureName,
                legTo: leg.DestinationCode,
                legToName: leg.DestinationName,
                stopLocation: stop.Location || stop.City || 'Unknown',
                stopCode: stop.Code || stop.AirportCode || null,
                stopDuration: stop.Duration || 'N/A',
                arrivalTime: stop.ArrivalTime || null,
                departureTime: stop.DepartureTime || null,
              }))
            )
        ),
      
        layoversList: (combo.FlightModels || []).flatMap((fm: any) => 
          (fm.FlightLegs || [])
            .filter((leg: any) => leg.Layer || leg.Layover)
            .map((leg: any) => ({
              airline: fm.AirlineName,
              flightNumber: leg.FlightNumber,
              layoverLocation: leg.Layer || leg.Layover,
              layoverDuration: leg.LayerDuration || leg.LayoverDuration,
              arrivalCode: leg.DestinationCode,
              arrivalName: leg.DestinationName,
              departureCode: leg.DepartureCode,
              departureName: leg.DepartureName,
            }))
        ),
        
        summary: {
          totalLayovers: combo.FlightModels?.reduce((acc: number, fm: any) => acc + (fm.Stops || 0), 0) || 0,
          totalTechnicalStops: (combo.FlightModels || []).reduce((acc: number, fm: any) => {
            return acc + (fm.FlightLegs || []).reduce((legAcc: number, leg: any) => {
              return legAcc + (leg.TechnicalStops || []).length;
            }, 0);
          }, 0),
          hasTechnicalStops: (combo.FlightModels || []).some((fm: any) => 
            (fm.FlightLegs || []).some((leg: any) => (leg.TechnicalStops || []).length > 0)
            ),
          },
        },
      }; 
    } 

  private generateSelectDataVariants(originalSelectData: string): Array<{ name: string; data: string }> {
    const variants: Array<{ name: string; data: string }> = [];
  
    variants.push({ name: 'Original', data: originalSelectData });
  
    const trimmed = originalSelectData.trim();
    if (trimmed !== originalSelectData && trimmed.length > 10) {
      variants.push({ name: 'Trimmed', data: trimmed });
    }
  

    const compressed = originalSelectData.replace(/\s+/g, '');
    if (compressed !== originalSelectData && compressed.length > 10) {
      if (!variants.some(v => v.data === compressed)) {
        variants.push({ name: 'Compressed', data: compressed });
      }
    }
  
    this.logger.log(`Generated ${variants.length} SelectData variants`);
    return variants;
  }
}
  