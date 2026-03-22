use anchor_lang::prelude::*;

declare_id!("Fg2PaFpoJsDG6S6m6zdx2uvXGUPV2tTz175nK8H"); // Replace with actual program ID after buildup

#[program]
pub mod supply_chain {
    use super::*;

    pub fn record_sale(
        ctx: Context<RecordSale>,
        sale_id: u64,
        product_id: u64,
        product_name: String,
        qty: u64,
        price: u64,
    ) -> Result<()> {
        let sale = &mut ctx.accounts.sale;
        sale.sale_id = sale_id;
        sale.product_id = product_id;
        sale.product_name = product_name;
        sale.qty = qty;
        sale.price = price;
        sale.seller = *ctx.accounts.seller.key;
        sale.timestamp = Clock::get()?.unix_timestamp;
        
        emit!(SaleRecorded {
            sale_id,
            product_id,
            product_name: sale.product_name.clone(),
            qty,
            price,
            seller: sale.seller,
            timestamp: sale.timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(sale_id: u64)]
pub struct RecordSale<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + 8 + 8 + 32 + 8 + 8 + 32 + 8, // Adjust space as needed
        seeds = [b"sale", sale_id.to_le_bytes().as_ref()],
        bump
    )]
    pub sale: Account<'info, Sale>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Sale {
    pub sale_id: u64,
    pub product_id: u64,
    pub product_name: String,
    pub qty: u64,
    pub price: u64,
    pub seller: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SaleRecorded {
    pub sale_id: u64,
    pub product_id: u64,
    pub product_name: String,
    pub qty: u64,
    pub price: u64,
    pub seller: Pubkey,
    pub timestamp: i64,
}
