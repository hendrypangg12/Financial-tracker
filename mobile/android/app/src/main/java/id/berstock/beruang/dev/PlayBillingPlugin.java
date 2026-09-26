package id.berstock.beruang.dev;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
  private BillingClient client;
  private final Map<String, ProductDetails> products = new HashMap<>();
  private final Map<String, String> productTypes = new HashMap<>();
  private final Map<String, String> offerTokens = new HashMap<>();
  private PluginCall purchaseCall;

  @Override public void load() {
    client = BillingClient.newBuilder(getContext()).setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).build();
    connect(null, null);
  }

  private void connect(Runnable ready, PluginCall call) {
    if (client.isReady()) { if (ready != null) ready.run(); return; }
    client.startConnection(new BillingClientStateListener() {
      public void onBillingServiceDisconnected() {}
      public void onBillingSetupFinished(BillingResult result) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && ready != null) ready.run();
        else if (call != null) call.reject(result.getDebugMessage());
      }
    });
  }

  @PluginMethod public void getProducts(PluginCall call) {
    JSArray ids = call.getArray("productIds");
    if (ids == null || ids.length() == 0) { call.reject("Daftar paket tidak valid."); return; }
    List<String> displayOrder = new ArrayList<>();
    try { for (Object raw : ids.toList()) displayOrder.add(String.valueOf(raw)); }
    catch (Exception e) { call.reject("Daftar paket tidak valid."); return; }
    products.clear(); productTypes.clear(); offerTokens.clear();
    connect(() -> queryType(ids, BillingClient.ProductType.INAPP, call, () ->
      queryType(ids, BillingClient.ProductType.SUBS, call, () -> {
        JSArray out = new JSArray();
        for (String id : displayOrder) {
          if (!products.containsKey(id)) continue;
          ProductDetails p = products.get(id); String type = productTypes.get(id); JSObject row = new JSObject();
          row.put("productId", id); row.put("productType", type); row.put("title", p.getTitle()); row.put("description", p.getDescription());
          if (BillingClient.ProductType.SUBS.equals(type)) {
            List<ProductDetails.SubscriptionOfferDetails> offers = p.getSubscriptionOfferDetails();
            String expectedBasePlan = "beruang_monthly_subscription".equals(id) ? "monthly-30d" : "annual-365d";
            ProductDetails.SubscriptionOfferDetails offer = null;
            if (offers != null) for (ProductDetails.SubscriptionOfferDetails candidate : offers)
              if (expectedBasePlan.equals(candidate.getBasePlanId())) { offer = candidate; break; }
            if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) continue;
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            ProductDetails.PricingPhase phase = phases.get(phases.size() - 1);
            row.put("price", phase.getFormattedPrice()); offerTokens.put(id, offer.getOfferToken());
          } else {
            ProductDetails.OneTimePurchaseOfferDetails offer = p.getOneTimePurchaseOfferDetails();
            if (offer == null) continue;
            row.put("price", offer.getFormattedPrice());
          }
          out.put(row);
        }
        JSObject value = new JSObject(); value.put("products", out); call.resolve(value);
      })), call);
  }

  private void queryType(JSArray ids, String type, PluginCall call, Runnable next) {
    List<QueryProductDetailsParams.Product> list = new ArrayList<>();
    try {
      for (Object raw : ids.toList()) {
        String id = String.valueOf(raw);
        boolean subscription = id.endsWith("_subscription");
        if (subscription != BillingClient.ProductType.SUBS.equals(type)) continue;
        list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build());
      }
    } catch (Exception e) { call.reject("Daftar paket tidak valid."); return; }
    if (list.isEmpty()) { next.run(); return; }
    client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(), (result, response) -> {
      if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(result.getDebugMessage()); return; }
      for (ProductDetails product : response.getProductDetailsList()) {
        products.put(product.getProductId(), product); productTypes.put(product.getProductId(), type);
      }
      next.run();
    });
  }

  @PluginMethod public void purchase(PluginCall call) {
    String id = call.getString("productId"), account = call.getString("obfuscatedAccountId");
    ProductDetails product = products.get(id); String type = productTypes.get(id);
    if (product == null || account == null || account.length() != 64) { call.reject("Paket belum siap. Muat ulang halaman."); return; }
    if (purchaseCall != null) { call.reject("Pembelian lain sedang diproses."); return; }
    BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product);
    if (BillingClient.ProductType.SUBS.equals(type)) {
      String offerToken = offerTokens.get(id);
      if (offerToken == null || offerToken.isEmpty()) { call.reject("Penawaran langganan belum tersedia."); return; }
      item.setOfferToken(offerToken);
    }
    BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build()))
      .setObfuscatedAccountId(account).build();
    purchaseCall = call; getBridge().saveCall(call);
    if (BillingClient.ProductType.SUBS.equals(type)) {
      client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (result, owned) -> {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { finishError(result.getDebugMessage()); return; }
        for (Purchase current : owned) if (current.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
          finishError("Kamu sudah punya langganan BerUang aktif. Kelola atau batalkan dulu di Google Play sebelum memilih paket lain."); return;
        }
        launchPurchase(params);
      });
      return;
    }
    launchPurchase(params);
  }

  private void launchPurchase(BillingFlowParams params) {
    BillingResult result = client.launchBillingFlow(getActivity(), params);
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) finishError(result.getDebugMessage());
  }

  @PluginMethod public void restorePurchases(PluginCall call) {
    restoredPurchases = new JSArray();
    connect(() -> queryOwned(BillingClient.ProductType.INAPP, call, () ->
      queryOwned(BillingClient.ProductType.SUBS, call, () -> {
        JSObject value = new JSObject(); value.put("purchases", restoredPurchases); restoredPurchases = new JSArray(); call.resolve(value);
      })), call);
  }
  private JSArray restoredPurchases = new JSArray();
  private void queryOwned(String type, PluginCall call, Runnable next) {
    client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(type).build(), (result, list) -> {
      if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(result.getDebugMessage()); return; }
      for (Purchase p : list) if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) restoredPurchases.put(purchaseJson(p));
      next.run();
    });
  }

  @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> list) {
    if (purchaseCall == null) return;
    if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { finishError("Pembelian dibatalkan."); return; }
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) { finishError(result.getDebugMessage()); return; }
    Purchase p = list.get(0); if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) { finishError("Pembayaran masih tertunda."); return; }
    PluginCall call = purchaseCall; purchaseCall = null; getBridge().releaseCall(call); call.resolve(purchaseJson(p));
  }

  private JSObject purchaseJson(Purchase p) {
    JSObject value = new JSObject(); value.put("purchaseToken", p.getPurchaseToken());
    value.put("productId", p.getProducts().isEmpty() ? "" : p.getProducts().get(0));
    value.put("orderId", p.getOrderId()); value.put("acknowledged", p.isAcknowledged()); return value;
  }
  private void finishError(String message) { PluginCall call = purchaseCall; purchaseCall = null; if (call != null) { getBridge().releaseCall(call); call.reject(message); } }
  @Override protected void handleOnDestroy() { if (client != null) client.endConnection(); }
}
