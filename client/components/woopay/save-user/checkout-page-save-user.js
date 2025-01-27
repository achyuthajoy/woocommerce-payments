/* eslint-disable max-len */
/**
 * External dependencies
 */
import React, { useEffect, useState, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
// eslint-disable-next-line import/no-unresolved
import { extensionCartUpdate } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import PhoneNumberInput from 'settings/phone-input';
import { getConfig } from 'utils/checkout';
import AdditionalInformation from './additional-information';
import Agreement from './agreement';
import Container from './container';
import useWooPayUser from '../hooks/use-woopay-user';
import useSelectedPaymentMethod from '../hooks/use-selected-payment-method';
import { recordUserEvent } from 'tracks';
import './style.scss';

const CheckoutPageSaveUser = ( { isBlocksCheckout } ) => {
	const [ isSaveDetailsChecked, setIsSaveDetailsChecked ] = useState(
		window.woopayCheckout?.PRE_CHECK_SAVE_MY_INFO || false
	);
	const [ phoneNumber, setPhoneNumber ] = useState( '' );
	const [ isPhoneValid, onPhoneValidationChange ] = useState( null );
	const [ userDataSent, setUserDataSent ] = useState( false );

	const isRegisteredUser = useWooPayUser();
	const { isWCPayChosen, isNewPaymentTokenChosen } = useSelectedPaymentMethod(
		isBlocksCheckout
	);
	const viewportWidth = window.document.documentElement.clientWidth;
	const viewportHeight = window.document.documentElement.clientHeight;

	const getPhoneFieldValue = () => {
		let phoneFieldValue = '';
		if ( isBlocksCheckout ) {
			phoneFieldValue =
				document.getElementById( 'phone' )?.value ||
				document.getElementById( 'shipping-phone' )?.value ||
				// in case of virtual products, the shipping phone is not available. So we also need to check the billing phone.
				document.getElementById( 'billing-phone' )?.value ||
				'';
		} else {
			// for classic checkout.
			phoneFieldValue =
				document.getElementById( 'billing_phone' )?.value || '';
		}

		// Take out any non-digit characters, except +.
		phoneFieldValue = phoneFieldValue.replace( /[^\d+]*/g, '' );

		if ( ! phoneFieldValue.startsWith( '+' ) ) {
			phoneFieldValue = '+1' + phoneFieldValue;
		}

		return phoneFieldValue;
	};

	const sendExtensionData = useCallback(
		( shouldClearData = false ) => {
			const data = shouldClearData
				? {}
				: {
						save_user_in_woopay: isSaveDetailsChecked,
						woopay_source_url:
							wcSettings?.storePages?.checkout?.permalink,
						woopay_is_blocks: true,
						woopay_viewport: `${ viewportWidth }x${ viewportHeight }`,
						woopay_user_phone_field: {
							full: phoneNumber,
						},
				  };

			extensionCartUpdate( {
				namespace: 'woopay',
				data: data,
			} ).then( () => {
				setUserDataSent( ! shouldClearData );
			} );
		},
		[ isSaveDetailsChecked, phoneNumber, viewportWidth, viewportHeight ]
	);

	const handleCountryDropdownClick = useCallback( () => {
		recordUserEvent( 'checkout_woopay_save_my_info_country_click' );
	}, [] );

	const handleCheckboxClick = ( e ) => {
		const isChecked = e.target.checked;
		if ( isChecked ) {
			setPhoneNumber( getPhoneFieldValue() );
		} else {
			setPhoneNumber( '' );
			if ( isBlocksCheckout ) {
				sendExtensionData( true );
			}
		}
		setIsSaveDetailsChecked( isChecked );

		recordUserEvent( 'checkout_save_my_info_click', {
			status: isChecked ? 'checked' : 'unchecked',
		} );
	};

	useEffect( () => {
		// Record Tracks event when the mobile number is entered.
		if ( isPhoneValid ) {
			recordUserEvent( 'checkout_woopay_save_my_info_mobile_enter' );
		}
	}, [ isPhoneValid ] );

	useEffect( () => {
		const formSubmitButton = isBlocksCheckout
			? document.querySelector(
					'button.wc-block-components-checkout-place-order-button'
			  )
			: document.querySelector(
					'form.woocommerce-checkout button[type="submit"]'
			  );

		if ( ! formSubmitButton ) {
			return;
		}

		const updateFormSubmitButton = () => {
			if ( isSaveDetailsChecked && isPhoneValid ) {
				formSubmitButton.removeAttribute( 'disabled' );

				// Set extension data if checkbox is selected and phone number is valid in blocks checkout.
				if ( isBlocksCheckout ) {
					sendExtensionData( false );
				}
			}

			if ( isSaveDetailsChecked && ! isPhoneValid ) {
				formSubmitButton.setAttribute( 'disabled', 'disabled' );
			}
		};

		updateFormSubmitButton();

		return () => {
			// Clean up
			formSubmitButton.removeAttribute( 'disabled' );
		};
	}, [
		isBlocksCheckout,
		isPhoneValid,
		isSaveDetailsChecked,
		sendExtensionData,
	] );

	// In classic checkout the saved tokens are under WCPay, so we need to check if new token is selected or not,
	// under WCPay. For blocks checkout considering isWCPayChosen is enough.
	const isWCPayWithNewTokenChosen = isBlocksCheckout
		? isWCPayChosen
		: isWCPayChosen && isNewPaymentTokenChosen;

	if (
		! getConfig( 'forceNetworkSavedCards' ) ||
		! isWCPayWithNewTokenChosen ||
		isRegisteredUser
	) {
		// Clicking the place order button sets the extension data in backend. If user changes the payment method
		// due to an error, we need to clear the extension data in backend.
		if ( isBlocksCheckout && userDataSent ) {
			sendExtensionData( true );
		}
		return null;
	}

	return (
		<Container isBlocksCheckout={ isBlocksCheckout }>
			<div className="save-details">
				<div className="save-details-header">
					<div
						className={
							isBlocksCheckout
								? 'wc-block-components-checkbox'
								: ''
						}
					>
						<label htmlFor="save_user_in_woopay">
							<input
								type="checkbox"
								checked={ isSaveDetailsChecked }
								onChange={ handleCheckboxClick }
								name="save_user_in_woopay"
								id="save_user_in_woopay"
								value="true"
								className={ `save-details-checkbox ${
									isBlocksCheckout
										? 'wc-block-components-checkbox__input'
										: ''
								}` }
								aria-checked={ isSaveDetailsChecked }
							/>
							{ isBlocksCheckout && (
								<svg
									className="wc-block-components-checkbox__mark"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 20"
								>
									<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
								</svg>
							) }
							<span>
								{ __(
									'Securely save my information for 1-click checkout',
									'woocommerce-payments'
								) }
							</span>
						</label>
					</div>
				</div>
				{ isSaveDetailsChecked && (
					<div
						className="save-details-form form-row"
						data-testid="save-user-form"
					>
						<input
							type="hidden"
							name="woopay_source_url"
							value={
								wcSettings?.storePages?.checkout?.permalink
							}
						/>
						<input
							type="hidden"
							name="woopay_viewport"
							value={ `${ viewportWidth }x${ viewportHeight }` }
						/>
						<PhoneNumberInput
							value={ phoneNumber }
							onValueChange={ setPhoneNumber }
							onValidationChange={ onPhoneValidationChange }
							onCountryDropdownClick={
								handleCountryDropdownClick
							}
							inputProps={ {
								name:
									'woopay_user_phone_field[no-country-code]',
							} }
							isBlocksCheckout={ isBlocksCheckout }
						/>
						{ ! isPhoneValid && (
							<p className="error-text">
								{ __(
									'Please enter a valid mobile phone number.',
									'woocommerce-payments'
								) }
							</p>
						) }
						<AdditionalInformation />
						<Agreement />
					</div>
				) }
			</div>
		</Container>
	);
};

export default CheckoutPageSaveUser;
