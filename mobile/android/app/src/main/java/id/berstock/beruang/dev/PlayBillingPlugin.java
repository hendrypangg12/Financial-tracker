package id.berstock.beruang.dev;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
  private BillingClient client;
  private final Map<String, ProductDetails> products = new HashMap<>();
  private PluginCall purchaseCall;

  @Override public void load() {
    client = BillingClient.newBuilder(getContext()).setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).build();
    connect(null);
  }

  private void connect(Runnable ready) {
    if (client.isReady()) { if (ready != null) ready.run(); return; }
    client.startConnection(new BillingClientStateListener() {
      public void onBillingServiceDisconnected() {}
      public void onBillingSetupFinished(BillingResult result) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && ready != null) ready.run();
      }
    });
  }

  @PluginMethod public void getProducts(PluginCall call) {
    JSArray ids = call.getArray("productIds");
    if (ids == null || ids.length() == 0) { call.reject("Daftar paket tidak valid."); return; }
    connect(() -> {
      List<QueryProductDetailsParams.Product> list = new ArrayList<>();
      try { for (Object id : ids.toList()) list.add(QueryProductDetailsParams.Product.newBuilder()
        .setProductId(String.valueOf(id)).setProductType(BillingClient.ProductType.INAPP).build()); }
      catch (Exception e) { call.reject("Daftar paket tidak valid."); return; }
      client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(), (result, response) -> {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(result.getDebugMessage()); return; }
        JSArray out = new JSArray();
        for (ProductDetails p : response.getProductDetailsList()) {
          products.put(p.getProductId(), p); JSObject row = new JSObject(); row.put("productId", p.getProductId());
          ProductDetails.OneTimePurchaseOfferDetails offer = p.getOneTimePurchaseOfferDetails();
          row.put("title", p.getTitle()); row.put("description", p.getDescription());
          row.put("price", offer == null ? "" : offer.getFormattedPrice()); out.put(row);
        }
        JSObject value = new JSObject(); value.put("products", out); call.resolve(value);
      });
    });
  }

  @PluginMethod public void purchase(PluginCall call) {
    String id = call.getString("productId"), account = call.getString("obfuscatedAccountId");
    ProductDetails product = products.get(id);
    if (product == null || account == null || account.length() != 64) { call.reject("Paket belum siap. Muat ulang halaman."); return; }
    if (purchaseCall != null) { call.reject("Pembelian lain sedang diproses."); return; }
    BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build();
    BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item))
      .setObfuscatedAccountId(account).build();
    purchaseCall = call; getBridge().saveCall(call);
    BillingResult result = client.launchBillingFlow(getActivity(), params);
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) finishError(result.getDebugMessage());
  }

  @PluginMethod public void restorePurchases(PluginCall call) {
    connect(() -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
      (result, list) -> { if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(result.getDebugMessage()); return; }
        JSArray out = new JSArray(); for (Purchase p : list) out.put(purchaseJson(p));
        JSObject value = new JSObject(); value.put("purchases", out); call.resolve(value); }));
  }

  @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> list) {
    if (purchaseCall == null) return;
    if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { finishError("Pembelian dibatalkan."); return; }
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) { finishError(result.getDebugMessage()); return; }
    Purchase p = list.get(0); if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) { finishError("Pembayaran masih tertunda."); return; }
    PluginCall call = purchaseCall; purchaseCall = null; getBridge().releaseCall(call); call.resolve(purchaseJson(p));
  }

  private JSObject purchaseJson(Purchase p) { JSObject value = new JSObject(); value.put("purchaseToken", p.getPurchaseToken());
    value.put("productId", p.getProducts().isEmpty() ? "" : p.getProducts().get(0)); value.put("orderId", p.getOrderId()); return value; }
  private void finishError(String message) { PluginCall call = purchaseCall; purchaseCall = null; if (call != null) { getBridge().releaseCall(call); call.reject(message); } }
  @Override protected void handleOnDestroy() { if (client != null) client.endConnection(); }
}
