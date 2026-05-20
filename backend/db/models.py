from sqlalchemy import String, Boolean, Numeric, Text, Date, BigInteger, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from typing import Optional
from datetime import date, datetime
from .database import Base


class Notice(Base):
    __tablename__ = "notices"

    id:                   Mapped[int]            = mapped_column(primary_key=True)
    bid_ntce_no:          Mapped[str]            = mapped_column(String(40))
    bid_ntce_ord:         Mapped[str]            = mapped_column(String(10), default="00")
    notice_type:          Mapped[str]            = mapped_column(String(10))
    bid_ntce_nm:          Mapped[str]            = mapped_column(String(500))
    ntce_instt_nm:        Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    dminstt_nm:           Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    bid_mtd_nm:           Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    cntrct_cncls_mthd_nm: Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    is_isp_ismp:          Mapped[bool]           = mapped_column(Boolean, default=False)
    isp_ismp_type:        Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)
    asign_bdgt_amt:       Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    presmpt_prce:         Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    bid_clse_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    bid_ntce_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    ntce_end_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    openg_dt:             Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    exec_term_start_dt:   Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    exec_term_end_dt:     Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bid_ntce_dtl_url:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    ntce_kind_nm:         Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    pipeline_status:      Mapped[str]            = mapped_column(String(20), default="collected")
    is_bookmarked:        Mapped[bool]           = mapped_column(Boolean, default=False)
    is_in_progress:       Mapped[bool]           = mapped_column(Boolean, default=False)
    parse_error_msg:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    content_embedding:    Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)
    collected_at:         Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    updated_at:           Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    attachments:       Mapped[list["Attachment"]]       = relationship("Attachment", back_populates="notice", cascade="all, delete-orphan")
    analysis_result:   Mapped["AnalysisResult"]         = relationship("AnalysisResult", back_populates="notice", uselist=False)
    proposal_outlines: Mapped[list["ProposalOutline"]]  = relationship("ProposalOutline", back_populates="notice")


class Attachment(Base):
    __tablename__ = "attachments"

    id:           Mapped[int]            = mapped_column(primary_key=True)
    notice_id:    Mapped[int]            = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    file_name:    Mapped[str]            = mapped_column(String(300))
    file_url:     Mapped[str]            = mapped_column(Text)
    file_type:    Mapped[str]            = mapped_column(String(20))          # pdf / hwp / doc 등
    local_path:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True) # 다운로드 후 로컬 경로
    parse_status: Mapped[str]            = mapped_column(String(20), default="pending")  # pending / done / failed
    downloaded_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="attachments")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id:                Mapped[int]            = mapped_column(primary_key=True)
    notice_id:         Mapped[int]            = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"), unique=True)

    # 정형
    project_type:      Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    estimated_price:   Mapped[Optional[int]]  = mapped_column(BigInteger, nullable=True)
    allocated_budget:  Mapped[Optional[int]]  = mapped_column(BigInteger, nullable=True)
    project_duration:  Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    contract_method:   Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    submit_deadline:   Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    risk_level:        Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)

    # 텍스트 / 반정형
    issuing_org:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    project_summary:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    project_scope:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    qualification:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    eval_criteria:     Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    requirements:      Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    tech_requirements: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    poison_clauses:    Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # 메타
    raw_analysis:      Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_used:        Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    prompt_version:    Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    analysis_status:   Mapped[str]            = mapped_column(String(20), default="pending")
    analyzed_at:       Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    updated_at:        Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="analysis_result")


class ProposalOutline(Base):
    __tablename__ = "proposal_outlines"

    id:                    Mapped[int]           = mapped_column(primary_key=True)
    notice_id:             Mapped[int]           = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    outline_version:       Mapped[int]           = mapped_column(default=1)
    guideline_base:        Mapped[str]           = mapped_column(String(20), default="MOIS_ISP")
    total_pages_estimate:  Mapped[Optional[int]] = mapped_column(nullable=True)
    sections:              Mapped[list]          = mapped_column(JSONB, default=list)
    model_used:            Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    prompt_version:        Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    generated_at:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_active:             Mapped[bool]          = mapped_column(Boolean, default=True)

    notice:   Mapped["Notice"]               = relationship("Notice", back_populates="proposal_outlines")
