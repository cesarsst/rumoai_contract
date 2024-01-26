// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ManagerRequests is Ownable {
  using Counters for Counters.Counter;
  using Address for address payable;

  // Estrutura de dados para representar um pedido
  struct Request {
    uint256 id;
    address payable seller;
    address payable customer;
    uint256 date;
    string[] products;
    uint256[] quantities;
    uint256[] valuesProducts;
    bool paid;
  }

  // Contador para gerar IDs únicos
  Counters.Counter private requestIdCounter;
  // Mapeamento de ID de pedido para pedido
  mapping(uint256 => Request) private requests;
  // Mapea o id do request de acordo com o seller
  mapping(address => uint256[]) private sellerToRequestIds;
  // Endereço do contrato do token ERC-20
  address public governanceTokenAddress;
  // Quantidade de tokens a ser cobrada por pedido
  uint256 public tokenFee;

  constructor(address _governanceTokenAddress, uint256 _tokenFee) {
    require(_governanceTokenAddress != address(0), "Token address cannot be zero");
    governanceTokenAddress = _governanceTokenAddress;
    tokenFee = _tokenFee;
  }

  // Evento emitido quando um pedido é criado
  event RequestCreated(uint256 id, address customer, uint256 date);
  // Evento emitido quando um pedido é pago
  event RequestPaid(uint256 id, address customer, uint256 date);
  // Evento emitido quando tokens são cobrados
  event TokensCharged(address indexed customer, uint256 amount);
  // Evento emitido quando a taxa é modificada
  event FeeChanged(uint256 amount);

  // Modificador para verificar se o remetente tem saldo suficiente de tokens
  modifier hasSufficientTokens() {
    require(governanceTokenAddress != address(0), "Token address not set");
    require(
      IERC20(governanceTokenAddress).balanceOf(msg.sender) >= tokenFee,
      "Insufficient tokens"
    );
    _;
  }

  // CREATE A NEW REQUEST
  function createRequest(
    address payable seller,
    string[] memory _products,
    uint256[] memory _quantities,
    uint256[] memory _valuesProducts
  ) external hasSufficientTokens {
    require(
      _products.length == _quantities.length && _quantities.length == _valuesProducts.length,
      "Invalid input lengths"
    );

    // Incrementa o contador de IDs
    requestIdCounter.increment();

    // Obtém o ID único para o novo pedido
    uint256 requestId = requestIdCounter.current();

    // Obtém a data atual em timestamp
    uint256 currentDate = block.timestamp;

    // Cria uma nova estrutura de pedido
    Request storage newRequest = requests[requestId];
    newRequest.id = requestId;
    newRequest.seller = seller;
    newRequest.customer = payable(msg.sender);
    newRequest.date = block.timestamp;
    newRequest.products = _products;
    newRequest.quantities = _quantities;
    newRequest.valuesProducts = _valuesProducts;
    newRequest.paid = false;

    // Verifica se o contrato tem permissão para gastar tokens do remetente
    _consumeFee();

    // Adiciona o id do request para getter via seller posterior
    sellerToRequestIds[seller].push(requestId);

    // Emite o evento de pedido criado
    emit RequestCreated(requestId, msg.sender, currentDate);
    // Emite o evento de cobrança de tokens
    emit TokensCharged(msg.sender, tokenFee);
  }

  // SET A NEW FEE
  function setFee(uint256 amount) public onlyOwner {
    tokenFee = amount;
    emit FeeChanged(tokenFee);
  }

  // CONSUME FEE WHEN CALLED
  function _consumeFee() internal {
    uint256 allowance = IERC20(governanceTokenAddress).allowance(msg.sender, address(this));
    require(allowance >= tokenFee, "Insufficient allowance");
    // Cobrar a quantia de tokens do remetente
    IERC20(governanceTokenAddress).transferFrom(msg.sender, address(this), tokenFee);
  }

  // Pay request
  // Função para realizar o pagamento de um pedido
  function payRequest(uint256 requestId) external {
    Request storage request = requests[requestId];

    // Verifica se o pedido existe
    require(request.id != 0, "Request does not exist");
    // Verifica se o pagamento ainda não foi realizado
    require(!request.paid, "Request already paid");
    // Verifica se o remetente é o cliente que fez o pedido
    require(msg.sender == request.customer, "Not the customer");

    // Realiza o pagamento cobrando a taxa por produto
    uint256 totalToPay = 0;
    for (uint256 i = 0; i < request.products.length; i++) {
      totalToPay += request.quantities[i] * request.valuesProducts[i];
    }
    totalToPay = totalToPay * (10 ** 18);

    // Verifica se o contrato tem permissão para gastar tokens do remetente
    uint256 allowance = IERC20(governanceTokenAddress).allowance(msg.sender, address(this));
    require(allowance >= totalToPay, "Insufficient allowance");

    // Cobrar a quantia de tokens do remetente
    IERC20(governanceTokenAddress).transferFrom(msg.sender, request.seller, totalToPay);
    // Consome a taxa
    _consumeFee();

    // Marca o pedido como pago
    request.paid = true;

    // Obtém a data atual em timestamp
    uint256 currentDate = block.timestamp;
    emit RequestPaid(requestId, msg.sender, currentDate);
  }

  // GET REQUEST BY ID
  function getRequest(
    uint256 _requestId
  )
    external
    view
    returns (
      uint256 id,
      address payable seller,
      address payable customer,
      uint256 date,
      string[] memory products, // Alterado para lista de strings
      uint256[] memory quantities,
      uint256[] memory valuesProducts,
      bool paid
    )
  {
    Request storage request = requests[_requestId];
    require(request.id != 0, "Request does not exist");

    id = request.id;
    seller = request.seller;
    customer = request.customer;
    date = request.date;
    products = request.products;
    quantities = request.quantities;
    valuesProducts = request.valuesProducts;
    paid = request.paid;
  }

  function getRequestsBySeller(address seller) public view returns (uint256[] memory) {
    // Retorna o índice de pedidos associados a um vendedor específico
    return sellerToRequestIds[seller];
  }
}
